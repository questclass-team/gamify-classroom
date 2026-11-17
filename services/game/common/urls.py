from django.urls import path

from gamification.views import CurrencyIconView, GroupGameConfigView

from .views import MeView, TeacherOnlyView

app_name = "game"

urlpatterns = [
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("teacher-only/", TeacherOnlyView.as_view(), name="teacher-only"),
    path(
        "groups/<str:group_id>/config",
        GroupGameConfigView.as_view(),
        name="group-game-config",
    ),
    path(
        "groups/<str:group_id>/config/currency-icon",
        CurrencyIconView.as_view(),
        name="currency-icon",
    ),
]
