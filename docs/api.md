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
| `alg` | `HS256` |
| `iss` | `questclass-core` |
| `aud` | `questclass` |
| `sub` | User identifier |
| `login` | LDAP login |
| `name` | Display name |
| `role` | `student`, `teacher` or `admin` |
| `iat` | Issued-at timestamp |
| `nbf` | Not-before timestamp |
| `exp` | Expiration timestamp |
| `jti` | Token identifier |

Core signs the token with the shared `Jwt__Secret` value. Game receives the
same value as `JWT_SECRET`. The secret must never be committed to the
repository.

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

Core login, LDAP authentication and JWT issuing are implemented on the
`feature/SCRUM-7-ldap-login` branch. The Core and Game branches must use the
same `JWT_SECRET`, issuer, audience and `HS256` algorithm before they are
connected end to end.
