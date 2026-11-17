from django.urls import reverse


def auth_header(token) -> dict[str, str]:
    return {
        "HTTP_AUTHORIZATION": f"Bearer {token}",
    }


def test_student_cannot_access_teacher_endpoint(
    api_client,
    token_factory,
) -> None:
    token = token_factory(role="student")

    response = api_client.get(
        reverse("game:teacher-only"),
        **auth_header(token),
    )

    assert response.status_code == 403
