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
) -> None:
    token = token_factory(
        signing_key=(
            "different-test-secret-that-is-not-the-core-secret-"
            "and-is-long-enough-for-hs384"
        ),
    )

    response = api_client.get(
        reverse("game:auth-me"),
        **auth_header(token),
    )

    assert response.status_code == 401


def test_expired_token_returns_401(api_client, token_factory) -> None:
    token = token_factory(expires_in=-60)

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


def test_wrong_algorithm_returns_401(api_client, token_factory) -> None:
    token = token_factory(
        algorithm="HS384",
        signing_key="algorithm-test-secret-that-is-long-enough-for-hs384",
    )

    response = api_client.get(
        reverse("game:auth-me"),
        **auth_header(token),
    )

    assert response.status_code == 401
