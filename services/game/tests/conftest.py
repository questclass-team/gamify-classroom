from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from django.conf import settings
import jwt
import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def signing_secret() -> str:
    return str(settings.SIMPLE_JWT["SIGNING_KEY"])


@pytest.fixture
def token_factory(signing_secret: str) -> Callable[..., str]:

    def create_token(
        *,
        role="teacher",
        issuer="questclass-core",
        audience="questclass",
        expires_in=300,
        signing_key=None,
        algorithm="HS256",
    ) -> str:
        now = datetime.now(UTC)
        now_timestamp = int(now.timestamp())

        payload = {
            "iss": issuer,
            "aud": audience,
            "sub": "123",
            "role": role,
            "iat": now_timestamp,
            "nbf": now_timestamp,
            "exp": int(
                (now + timedelta(seconds=expires_in)).timestamp(),
            ),
            "jti": "test-token-123",
        }

        return jwt.encode(
            payload,
            signing_key or signing_secret,
            algorithm=algorithm,
        )

    return create_token
