from django.urls import path

from gamification.views import (
    BadgeCreateView,
    BadgeDetailView,
    CurrencyIconView,
    GroupGameConfigView,
    StudentBadgeAwardDetailView,
    StudentBadgeAwardView,
    StudentProgressView,
    StudentRewardsView,
)

from .views import MeView, TeacherOnlyView

app_name = "game"

urlpatterns = [
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("teacher-only/", TeacherOnlyView.as_view(), name="teacher-only"),
    path(
        "groups/<uuid:group_id>/config",
        GroupGameConfigView.as_view(),
        name="group-game-config",
    ),
    path(
        "groups/<uuid:group_id>/config/currency-icon",
        CurrencyIconView.as_view(),
        name="currency-icon",
    ),
    path(
        "groups/<uuid:group_id>/students/<uuid:student_id>/progress",
        StudentProgressView.as_view(),
        name="student-progress",
    ),
    path(
        "groups/<uuid:group_id>/students/<uuid:student_id>/rewards",
        StudentRewardsView.as_view(),
        name="student-rewards",
    ),
    path(
        "groups/<uuid:group_id>/badges",
        BadgeCreateView.as_view(),
        name="group-badge-create",
    ),
    path(
        "groups/<uuid:group_id>/badges/<int:badge_id>",
        BadgeDetailView.as_view(),
        name="group-badge-detail",
    ),
    path(
        "groups/<uuid:group_id>/students/<uuid:student_id>/badges",
        StudentBadgeAwardView.as_view(),
        name="student-badge-award",
    ),
    path(
        "groups/<uuid:group_id>/students/<uuid:student_id>/badges/<int:award_id>",
        StudentBadgeAwardDetailView.as_view(),
        name="student-badge-award-detail",
    ),
]
