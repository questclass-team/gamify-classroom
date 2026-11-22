from uuid import UUID

from django.db import transaction
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

from .models import (
    CURRENCY_ICON_CONTENT_TYPES,
    CURRENCY_ICON_MAX_BYTES,
    GroupGameConfiguration,
    Rank,
)
from .serializers import (
    AwardPointsSerializer,
    CurrencyIconResponseSerializer,
    GroupGameConfigSerializer,
    RewardHistoryItemSerializer,
    StudentProgressSerializer,
    UpdateGameConfigSerializer,
)
from .services import (
    BalanceLimitError,
    award_points,
    get_reward_history,
    get_student_progress,
)


class CoreServiceUnavailable(APIException):
    status_code = 503
    default_detail = "Core service is unavailable."
    default_code = "core_unavailable"


def ensure_group_access(request: Request, group_id: str) -> None:
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
            group_id=str(group_id),
            student_id=str(student_id),
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
    def get(self, request: Request, group_id: str) -> Response:
        ensure_group_access(request, group_id)
        configuration = GroupGameConfiguration.objects.filter(
            group_id=group_id,
        ).first()
        if configuration is None:
            configuration = GroupGameConfiguration.objects.create(group_id=group_id)
        return config_response(configuration)

    @extend_schema(
        request=UpdateGameConfigSerializer,
        responses=GroupGameConfigSerializer,
        summary="Update a group's game configuration",
    )
    @transaction.atomic
    def put(self, request: Request, group_id: str) -> Response:
        ensure_group_access(request, group_id)
        serializer = UpdateGameConfigSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        configuration, _ = GroupGameConfiguration.objects.get_or_create(
            group_id=group_id,
        )
        configuration.currency_name = data["currency_name"]
        configuration.save()
        configuration.ranks.all().delete()
        Rank.objects.bulk_create(
            [
                Rank(
                    configuration=configuration,
                    name=rank["name"],
                    threshold=rank["threshold"],
                )
                for rank in data["ranks"]
            ],
        )
        return config_response(configuration)


class CurrencyIconView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)
    parser_classes = (MultiPartParser,)

    @extend_schema(
        responses=CurrencyIconResponseSerializer,
        summary="Upload a group's currency icon",
    )
    @transaction.atomic
    def put(self, request: Request, group_id: str) -> Response:
        ensure_group_access(request, group_id)
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            raise ValidationError({"file": "An icon file is required."})
        if uploaded_file.content_type not in CURRENCY_ICON_CONTENT_TYPES:
            raise ValidationError({"file": "Icon must be PNG, GIF or WebP."})
        if uploaded_file.size > CURRENCY_ICON_MAX_BYTES:
            raise ValidationError({"file": "Icon must not exceed 256 KB."})

        configuration, _ = GroupGameConfiguration.objects.get_or_create(
            group_id=group_id,
        )
        if configuration.currency_icon:
            configuration.currency_icon.delete(save=False)
        configuration.currency_icon.save(uploaded_file.name, uploaded_file, save=True)
        return Response(
            CurrencyIconResponseSerializer(
                {"currencyIconUrl": self._icon_url(configuration)},
            ).data,
        )

    @extend_schema(
        responses={204: None},
        summary="Delete a group's currency icon",
    )
    @transaction.atomic
    def delete(self, request: Request, group_id: str) -> Response:
        ensure_group_access(request, group_id)
        configuration = GroupGameConfiguration.objects.filter(
            group_id=group_id,
        ).first()
        if configuration is not None and configuration.currency_icon:
            configuration.currency_icon.delete(save=True)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    def _icon_url(configuration: GroupGameConfiguration) -> str:
        if not configuration.currency_icon:
            raise ValidationError("Icon could not be stored.")
        return configuration.currency_icon.url


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
            group_id=str(group_id),
            student_id=str(student_id),
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
            group_id=str(group_id),
            student_id=str(student_id),
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
                group_id=str(group_id),
                student_id=str(student_id),
                points=serializer.validated_data["points"],
                reason=serializer.validated_data["reason"],
                awarded_by=str(request.auth["sub"]),
            )
        except BalanceLimitError as exc:
            raise ValidationError(
                {"points": "Award would exceed the balance limit."}
            ) from exc

        response_serializer = RewardHistoryItemSerializer(reward)

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )
