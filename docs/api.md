# API contract

The public API is served through the nginx gateway at `http://localhost:8080`.
The service prefix is kept in the request path:

| Service | Prefix | API documentation |
|---|---|---|
| Core | `/api/core/` | `/api/core/swagger` |
| Game | `/api/game/` | `/api/game/docs/` |

## Authentication

Protected endpoints use the HTTP header:

```http
Authorization: Bearer <access-token>
```

The Game service verifies, but does not issue, access tokens. The current
verification contract is:

| JWT field | Required value / meaning |
|---|---|
| `alg` | `RS256` |
| `iss` | `questclass-core` |
| `aud` | `questclass-api` |
| `sub` | User identifier |
| `role` | `student`, `teacher` or `admin` |
| `iat` | Issued-at timestamp |
| `exp` | Expiration timestamp |
| `jti` | Token identifier |
| `token_type` | `access` |

Game verifies the signature with the RSA public key configured by
`JWT_VERIFYING_KEY_PATH`. The private signing key must remain in Core and must
never be committed to the repository.

## Game service

### `GET /api/game/auth/me/`

Returns the authenticated user claims used by Game.

Successful response:

```json
{
  "user_id": "123",
  "role": "teacher"
}
```

Responses:

- `200 OK` — valid access token;
- `401 Unauthorized` — missing, malformed, expired, incorrectly signed, or
  otherwise invalid token.

### `GET /api/game/teacher-only/`

Temporary role-protected endpoint used to verify authorization.

Successful response:

```json
{
  "message": "teacher"
}
```

Responses:

- `200 OK` — valid token with `role=teacher`;
- `401 Unauthorized` — no valid access token;
- `403 Forbidden` — authenticated user does not have the teacher role.

## Local API documentation

After starting Docker Compose, open:

```text
http://localhost:8080/api/game/docs/
```

The machine-readable OpenAPI document is available at:

```text
http://localhost:8080/api/game/schema/
```

## Current scope

Core login, LDAP authentication and JWT issuing are not implemented yet. Until
Core provides the issuer and signing key, Game tests use local RSA test keys.
