from uuid import UUID

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.core_client import CoreClient, CoreGroupNotFound, CoreUnavailable
from common.permissions import IsTeacher

from .models import GroupGameConfiguration
from .serializers import (
    AwardBadgeSerializer,
    AwardPointsSerializer,
    BadgeAwardSerializer,
    BadgeSerializer,
    CreateBadgeSerializer,
    CurrencyIconResponseSerializer,
    GroupGameConfigSerializer,
    RewardHistoryItemSerializer,
    StudentProgressSerializer,
    UpdateGameConfigSerializer,
)
from .services import (
    BadgeAlreadyAwardedError,
    BadgeAwardNotFoundError,
    BadgeNotFoundError,
    BalanceLimitError,
    CurrencyIconError,
    award_badge,
    award_points,
    create_badge,
    delete_currency_icon,
    get_group_game_config,
    get_reward_history,
    get_student_progress,
    list_group_badges,
    list_student_badges,
    revoke_badge,
    update_badge,
    update_group_game_config,
    upload_currency_icon,
)


class CoreServiceUnavailable(APIException):
    status_code = 503
    default_detail = "Core service is unavailable."
    default_code = "core_unavailable"


class BadgeAlreadyAwarded(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This student already has this badge."
    default_code = "badge_already_awarded"


def ensure_group_access(request: Request, group_id: UUID) -> None:
    authorization = request.headers.get("Authorization", "")
    try:
        CoreClient().ensure_group_access(group_id, authorization)
    except CoreGroupNotFound as exc:
        raise NotFound("Group not found.") from exc
    except CoreUnavailable as exc:
        raise CoreServiceUnavailable from exc


def ensure_student_in_group(
    request: Request,
    group_id: UUID,
    student_id: UUID,
) -> None:
    authorization = request.headers.get("Authorization", "")

    try:
        CoreClient().ensure_student_in_group(
            group_id=group_id,
            student_id=student_id,
            authorization=authorization,
        )
    except CoreGroupNotFound as exc:
        raise NotFound("Group or student not found.") from exc
    except CoreUnavailable as exc:
        raise CoreServiceUnavailable from exc


def config_response(configuration: GroupGameConfiguration) -> Response:
    serializer = GroupGameConfigSerializer(configuration)
    return Response(serializer.data)


class GroupGameConfigView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)
    parser_classes = (JSONParser,)

    @extend_schema(
        responses=GroupGameConfigSerializer,
        summary="Get a group's game configuration",
    )
    def get(self, request: Request, group_id: UUID) -> Response:
        ensure_group_access(request, group_id)
        configuration = get_group_game_config(group_id=group_id)
        return config_response(configuration)

    @extend_schema(
        request=UpdateGameConfigSerializer,
        responses=GroupGameConfigSerializer,
        summary="Update a group's game configuration",
    )
    def put(self, request: Request, group_id: UUID) -> Response:
        ensure_group_access(request, group_id)
        serializer = UpdateGameConfigSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        configuration = update_group_game_config(
            group_id=group_id,
            currency_name=data["currency_name"],
            ranks=data["ranks"],
        )
        return config_response(configuration)


class CurrencyIconView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)
    parser_classes = (MultiPartParser,)

    @extend_schema(
        responses=CurrencyIconResponseSerializer,
        summary="Upload a group's currency icon",
    )
    def put(self, request: Request, group_id: UUID) -> Response:
        ensure_group_access(request, group_id)
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            raise ValidationError({"file": "An icon file is required."})
        try:
            icon_url = upload_currency_icon(
                group_id=group_id,
                uploaded_file=uploaded_file,
            )
        except CurrencyIconError as exc:
            raise ValidationError({"file": str(exc)}) from exc

        return Response(
            CurrencyIconResponseSerializer({"currencyIconUrl": icon_url}).data,
        )

    @extend_schema(
        responses={204: None},
        summary="Delete a group's currency icon",
    )
    def delete(self, request: Request, group_id: UUID) -> Response:
        ensure_group_access(request, group_id)
        delete_currency_icon(group_id=group_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class StudentProgressView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)

    @extend_schema(
        responses=StudentProgressSerializer,
        summary="Get student's progress",
    )
    def get(
        self,
        request: Request,
        group_id: UUID,
        student_id: UUID,
    ) -> Response:
        ensure_student_in_group(request, group_id, student_id)

        progress = get_student_progress(
            group_id=group_id,
            student_id=student_id,
        )

        serializer = StudentProgressSerializer(progress)

        return Response(serializer.data)


class StudentRewardsView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)
    parser_classes = (JSONParser,)

    @extend_schema(
        responses=RewardHistoryItemSerializer(many=True),
        summary="Get student's reward history",
    )
    def get(
        self,
        request: Request,
        group_id: UUID,
        student_id: UUID,
    ) -> Response:
        ensure_student_in_group(request, group_id, student_id)

        rewards = get_reward_history(
            group_id=group_id,
            student_id=student_id,
        )

        serializer = RewardHistoryItemSerializer(rewards, many=True)

        return Response(serializer.data)

    @extend_schema(
        request=AwardPointsSerializer,
        responses={201: RewardHistoryItemSerializer},
        summary="Award points to a student",
    )
    def post(
        self,
        request: Request,
        group_id: UUID,
        student_id: UUID,
    ) -> Response:
        ensure_student_in_group(request, group_id, student_id)

        serializer = AwardPointsSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            reward = award_points(
                group_id=group_id,
                student_id=student_id,
                points=serializer.validated_data["points"],
                reason=serializer.validated_data["reason"],
                awarded_by=str(request.auth["sub"]),
            )
        except BalanceLimitError as exc:
            raise ValidationError(
                {"points": "Award would exceed the balance limit."},
            ) from exc

        response_serializer = RewardHistoryItemSerializer(reward)

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class BadgeListCreateView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)
    parser_classes = (JSONParser,)

    @extend_schema(
        responses={200: BadgeSerializer(many=True)},
        summary="List badges in a group",
    )
    def get(self, request: Request, group_id: UUID) -> Response:
        ensure_group_access(request=request, group_id=group_id)
        badges = list_group_badges(group_id=group_id)
        return Response(BadgeSerializer(badges, many=True).data)

    @extend_schema(
        request=CreateBadgeSerializer,
        responses={201: BadgeSerializer},
        summary="Create a badge in a group",
    )
    def post(
        self,
        request: Request,
        group_id: UUID,
    ) -> Response:
        ensure_group_access(request=request, group_id=group_id)

        serializer = CreateBadgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        badge = create_badge(
            group_id=group_id,
            **serializer.validated_data,
        )

        return Response(
            BadgeSerializer(badge).data,
            status=status.HTTP_201_CREATED,
        )


class BadgeDetailView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)
    parser_classes = (JSONParser,)

    @extend_schema(
        request=CreateBadgeSerializer,
        responses={200: BadgeSerializer},
        summary="Update a badge in a group",
    )
    def patch(self, request: Request, group_id: UUID, badge_id: int) -> Response:
        ensure_group_access(request, group_id)
        serializer = CreateBadgeSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            badge = update_badge(
                group_id=group_id, badge_id=badge_id, **serializer.validated_data
            )
        except BadgeNotFoundError as exc:
            raise NotFound("Badge not found.") from exc
        return Response(BadgeSerializer(badge).data)


class StudentBadgeAwardView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)
    parser_classes = (JSONParser,)

    @extend_schema(
        responses={200: BadgeAwardSerializer(many=True)},
        summary="List a student's active badges",
    )
    def get(self, request: Request, group_id: UUID, student_id: UUID) -> Response:
        ensure_student_in_group(request, group_id, student_id)
        awards = list_student_badges(group_id=group_id, student_id=student_id)
        return Response(BadgeAwardSerializer(awards, many=True).data)

    @extend_schema(
        request=AwardBadgeSerializer,
        responses={201: BadgeAwardSerializer},
        summary="Award a badge to a student",
    )
    def post(
        self,
        request: Request,
        group_id: UUID,
        student_id: UUID,
    ) -> Response:
        ensure_student_in_group(
            request=request,
            group_id=group_id,
            student_id=student_id,
        )

        serializer = AwardBadgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            award = award_badge(
                group_id=group_id,
                badge_id=serializer.validated_data["badgeId"],
                student_id=student_id,
                awarded_by=str(request.auth["sub"]),
            )
        except BadgeNotFoundError as exc:
            raise NotFound("Badge not found.") from exc
        except BadgeAlreadyAwardedError as exc:
            raise BadgeAlreadyAwarded from exc

        return Response(
            BadgeAwardSerializer(award).data,
            status=status.HTTP_201_CREATED,
        )


class StudentBadgeAwardDetailView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)

    @extend_schema(
        responses={204: None},
        summary="Revoke a badge award",
    )
    def delete(
        self, request: Request, group_id: UUID, student_id: UUID, award_id: int
    ) -> Response:
        ensure_student_in_group(request, group_id, student_id)
        try:
            revoke_badge(group_id=group_id, student_id=student_id, award_id=award_id)
        except BadgeAwardNotFoundError as exc:
            raise NotFound("Badge award not found.") from exc
        return Response(status=status.HTTP_204_NO_CONTENT)
