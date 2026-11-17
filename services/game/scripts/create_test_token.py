from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import jwt


PROJECT_DIR = Path(__file__).resolve().parents[1]
PRIVATE_KEY_PATH = PROJECT_DIR / "local-keys" / "jwt-private.pem"


def create_token(
    *,
    role: str = "teacher",
    issuer: str = "questclass-core",
    audience: str = "questclass-api",
    token_type: str = "access",
    expires_in: int = 300,
) -> str:
    now = datetime.now(UTC)

    payload = {
        "iss": issuer,
        "aud": audience,
        "sub": "123",
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
        "jti": str(uuid4()),
        "token_type": token_type,
    }

    private_key = PRIVATE_KEY_PATH.read_text(encoding="utf-8")

    return jwt.encode(
        payload,
        private_key,
        algorithm="RS256",
    )


if __name__ == "__main__":
    print(create_token())
