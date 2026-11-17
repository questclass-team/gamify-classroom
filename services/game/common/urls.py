from django.urls import path

from .views import MeView, TeacherOnlyView

app_name = "game"

urlpatterns = [
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("teacher-only/", TeacherOnlyView.as_view(), name="teacher-only"),
]
