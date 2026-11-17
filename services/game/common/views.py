from drf_spectacular.utils import extend_schema
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .permissions import IsTeacher
from .serializers import MeResponseSerializer, TeacherResponseSerializer


class MeView(GenericAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = MeResponseSerializer

    @extend_schema(
        summary="Get the authenticated user",
        description="Returns the user identifier and role from the validated access token.",
    )
    def get(self, request: Request) -> Response:
        serializer = self.get_serializer(
            instance={
                "user_id": request.auth.get("sub"),
                "role": request.auth.get("role"),
            },
        )

        return Response(serializer.data)


# Temporary endpoint used to verify role-based permissions.
class TeacherOnlyView(GenericAPIView):
    permission_classes = (IsTeacher,)
    serializer_class = TeacherResponseSerializer

    @extend_schema(
        summary="Check teacher access",
        description="Temporary endpoint used to verify teacher-only authorization.",
    )
    def get(self, _request: Request) -> Response:
        serializer = self.get_serializer(
            instance={"message": "teacher"},
        )

        return Response(serializer.data)
