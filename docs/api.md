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

## Core service

Errors are RFC 9457 problem details (`application/problem+json`, fields `type`, `title`, `status`,
`detail`, `instance`, `traceId`). Full schemas: `/api/core/swagger`. The frontend's TypeScript types for these
endpoints are in `frontend/src/api/types.ts`.

### Session

The access token (JWT above) lives 15 minutes. Login also sets the refresh cookie `qc_refresh` (HttpOnly,
Secure, SameSite=Strict, path `/api/core/auth`); the session lasts at most 8 hours from login. Browsers accept
the Secure cookie on `https://` and on `http://localhost` only.

| Endpoint | Auth | Request | Responses |
|---|---|---|---|
| `POST /api/core/auth/login` | none | `{ "login", "password" }` (LABS / test LDAP) | `200 { accessToken, user }` + cookie; `400` invalid input; `401` wrong login or password; `403` valid LDAP account that was not imported; `429` too many attempts from this address |
| `POST /api/core/auth/refresh` | refresh cookie | no body | `200 { accessToken, user }` + new cookie (rotation); `401` session ended (expired, logged out or reused cookie) |
| `POST /api/core/auth/logout` | refresh cookie | no body | `204` (also when already logged out); other devices stay logged in |
| `GET /api/core/auth/me` | Bearer | — | `200 user`; `401` no valid token or the account no longer exists |

`user` is `{ "id": "<uuid>", "login": "jkowalski", "displayName": "Jan Kowalski", "role": "teacher" }`.
The role and the account are read from the database on every refresh and `/me`, so a changed role or a deleted
account takes effect without logging in again.

A refresh cookie that was already rotated and comes back after 30 seconds is treated as stolen: every session
of that user ends.

### Account import

`POST /api/core/admin/users/import` — admin only, `multipart/form-data` with the CSV in the field `file`
(UTF-8, at most 1 MB):

```csv
login,first_name,last_name,role
jkowalski,Jan,Kowalski,teacher
```

Response `200`:

```json
{
  "created": [{ "line": 2, "login": "jkowalski", "displayName": "Jan Kowalski", "role": "teacher" }],
  "skipped": [{ "line": 3, "login": "anowak", "reason": "already_exists" }]
}
```

Skip reasons: `missing_field`, `invalid_login`, `invalid_role`, `duplicate_in_file`, `already_exists`. Errors:
`400` no file / wrong header / not UTF-8, `401`, `403` not an admin, `413` file larger than 1 MB.

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

### Group game configuration

Game configuration endpoints require a valid teacher JWT. Game verifies that the group exists and belongs to the
teacher through Core; Game stores only the external `group_id`.

#### `GET /api/game/groups/{groupId}/config`

Returns the saved configuration, or the defaults when the group has not been configured yet:

```json
{
  "currencyName": "Punkty",
  "currencyIconUrl": null,
  "ranks": [
    { "name": "Nowicjusz", "threshold": 0 },
    { "name": "Giermek", "threshold": 100 }
  ]
}
```

#### `PUT /api/game/groups/{groupId}/config`

Accepts the same configuration shape. Currency names are limited to 30 characters, rank names to 40 characters,
and a group can contain at most 20 ranks. Thresholds are unique integers from 0 to 1,000,000. The response is
sorted by threshold.

#### `PUT /api/game/groups/{groupId}/config/currency-icon`

Accepts `multipart/form-data` with the `file` field. PNG, GIF and WebP files up to 256 KB are accepted. The response
contains `currencyIconUrl`.

#### `DELETE /api/game/groups/{groupId}/config/currency-icon`

Removes the icon and returns `204 No Content`.

These endpoints return `400` for invalid configuration or files, `401` for an invalid token, `403` for a non-teacher,
`404` for a missing/foreign group and `503` when Core cannot be reached.

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

Core issues the tokens (login, refresh, logout, `/me`) and imports accounts; Game verifies the same tokens.
Both use the same `JWT_SECRET` (Core: `Jwt__Secret`), issuer `questclass-core`, audience `questclass` and
`HS256` — checked end to end: a token from Core is accepted by `GET /api/game/auth/me/` with the same user id
and role.
