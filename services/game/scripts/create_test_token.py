from datetime import UTC, datetime, timedelta
import os
from uuid import uuid4

import jwt

DEFAULT_SECRET = "local-development-secret-not-for-production-use"


def create_token(
    *,
    role: str = "teacher",
    issuer: str = "questclass-core",
    audience: str = "questclass",
    expires_in: int = 300,
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
        "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
        "jti": str(uuid4()),
    }

    return jwt.encode(
        payload,
        os.environ.get("JWT_SECRET", DEFAULT_SECRET),
        algorithm="HS256",
    )


if __name__ == "__main__":
    print(create_token())
