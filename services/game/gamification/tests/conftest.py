from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from django.conf import settings
from rest_framework.test import APIClient


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def token_factory() -> Callable[..., str]:
    def create_token(
        *,
        role: str = "teacher",
        issuer: str = "questclass-core",
        audience: str = "questclass",
        expires_in: int = 300,
        subject: str = "123",
    ) -> str:
        now = datetime.now(UTC)
        now_timestamp = int(now.timestamp())
        payload = {
            "iss": issuer,
            "aud": audience,
            "sub": subject,
            "role": role,
            "iat": now_timestamp,
            "nbf": now_timestamp,
            "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
            "jti": "gamification-api-test-token",
        }
        return jwt.encode(
            payload,
            str(settings.SIMPLE_JWT["SIGNING_KEY"]),
            algorithm="HS256",
        )

    return create_token
