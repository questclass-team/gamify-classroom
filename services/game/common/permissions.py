from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import Token


class IsTeacher(BasePermission):
    message = "Teacher role required."

    def has_permission(
        self,
        request: Request,
        _view: APIView,
    ) -> bool:
        auth: Token | None = request.auth

        return (
            request.user.is_authenticated
            and auth is not None
            and auth.get("role") == "teacher"
        )


class IsAdmin(BasePermission):
    message = "Admin role required."

    def has_permission(
        self,
        request: Request,
        _view: APIView,
    ) -> bool:
        auth: Token | None = request.auth

        return (
            request.user.is_authenticated
            and auth is not None
            and auth.get("role") == "admin"
        )


class IsTeacherOrAdmin(BasePermission):
    message = "Teacher or admin role required."

    def has_permission(
        self,
        request: Request,
        _view: APIView,
    ) -> bool:
        auth: Token | None = request.auth

        return (
            request.user.is_authenticated
            and auth is not None
            and auth.get("role") in {"teacher", "admin"}
        )


class IsStudent(BasePermission):
    message = "Student role required."

    def has_permission(
        self,
        request: Request,
        _view: APIView,
    ) -> bool:
        auth: Token | None = request.auth

        return (
            request.user.is_authenticated
            and auth is not None
            and auth.get("role") == "student"
        )


class IsTeacherOrStudent(BasePermission):
    message = "Teacher or student role required."

    def has_permission(
        self,
        request: Request,
        _view: APIView,
    ) -> bool:
        auth: Token | None = request.auth

        return (
            request.user.is_authenticated
            and auth is not None
            and auth.get("role") in {"teacher", "student"}
        )
