from django.urls import reverse


def auth_header(token) -> dict[str, str]:
    return {
        "HTTP_AUTHORIZATION": f"Bearer {token}",
    }


def test_valid_teacher_token(api_client, token_factory) -> None:
    token = token_factory(role="teacher")

    response = api_client.get(
        reverse("game:auth-me"),
        **auth_header(token),
    )

    assert response.status_code == 200
    assert response.json() == {
        "user_id": "123",
        "role": "teacher",
    }


def test_valid_student_token(api_client, token_factory) -> None:
    token = token_factory(role="student")

    response = api_client.get(
        reverse("game:auth-me"),
        **auth_header(token),
    )

    assert response.status_code == 200
    assert response.json()["role"] == "student"


def test_missing_token_returns_401(api_client) -> None:
    response = api_client.get(
        reverse("game:auth-me"),
    )

    assert response.status_code == 401


def test_invalid_signature_returns_401(
    api_client,
    token_factory,
    another_private_key,
) -> None:
    token = token_factory(
        signing_key=another_private_key,
    )

    response = api_client.get(
        reverse("game:auth-me"),
        **auth_header(token),
    )

    assert response.status_code == 401


def test_expired_token_returns_401(api_client, token_factory) -> None:
    token = token_factory(expires_in=-10)

    response = api_client.get(
        reverse("game:auth-me"),
        **auth_header(token),
    )

    assert response.status_code == 401


def test_malformed_token_returns_401(api_client) -> None:
    response = api_client.get(
        reverse("game:auth-me"),
        **auth_header("not.a.valid.jwt"),
    )

    assert response.status_code == 401


def test_invalid_issuer_returns_401(api_client, token_factory) -> None:
    token = token_factory(
        issuer="wrong-core",
    )

    response = api_client.get(
        reverse("game:auth-me"),
        **auth_header(token),
    )

    assert response.status_code == 401


def test_invalid_audience_returns_401(api_client, token_factory) -> None:
    token = token_factory(
        audience="wrong-api",
    )

    response = api_client.get(
        reverse("game:auth-me"),
        **auth_header(token),
    )

    assert response.status_code == 401


def test_refresh_token_returns_401(api_client, token_factory) -> None:
    token = token_factory(
        token_type="refresh",
    )

    response = api_client.get(
        reverse("game:auth-me"),
        **auth_header(token),
    )

    assert response.status_code == 401
