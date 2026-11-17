from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from pathlib import Path

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from rest_framework.test import APIClient

PROJECT_DIR = Path(__file__).resolve().parents[1]
PRIVATE_KEY_PATH = PROJECT_DIR / "local-keys" / "jwt-private.pem"


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def private_key() -> str:
    return PRIVATE_KEY_PATH.read_text(encoding="utf-8")


@pytest.fixture
def another_private_key() -> str:
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")


@pytest.fixture
def token_factory(private_key: str) -> Callable[..., str]:

    def create_token(
        *,
        role="teacher",
        issuer="questclass-core",
        audience="questclass-api",
        token_type="access",
        expires_in=300,
        signing_key=None,
    ):
        now = datetime.now(UTC)

        payload = {
            "iss": issuer,
            "aud": audience,
            "sub": "123",
            "role": role,
            "iat": int(now.timestamp()),
            "exp": int(
                (now + timedelta(seconds=expires_in)).timestamp(),
            ),
            "jti": "test-token-123",
            "token_type": token_type,
        }

        return jwt.encode(
            payload,
            signing_key or private_key,
            algorithm="RS256",
        )

    return create_token
