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

### Groups

Teacher only (`403` for students and admins, `401` without a token). A teacher sees and changes only their own groups:
another teacher's group answers `404`, exactly like a group that does not exist.

| Endpoint | Request | Responses |
|---|---|---|
| `POST /api/core/groups` | `{ "name" }` — 1–100 characters after trimming, need not be unique | `201 GroupSummary` + `Location: /api/core/groups/{id}`; `400` empty or too long name |
| `GET /api/core/groups` | — | `200 GroupSummary[]`, the caller's groups in Polish alphabetical order |
| `GET /api/core/groups/{groupId}` | — | `200 GroupDetail`; `404` missing, deleted, another teacher's group, or an id that is not a UUID |
| `POST /api/core/groups/{groupId}/students` | `{ "studentId" }` | `201 GroupStudent` added; `200 GroupStudent` already in the group (nothing changes, never a duplicate); `400` no `studentId`; `404` group not the caller's (`Groups.NotFound`) or the id is not an existing student account (`Groups.StudentNotFound`) |
| `DELETE /api/core/groups/{groupId}/students/{studentId}` | — | `204`, also when the student was not in the group; `404` group not the caller's. The account and other groups are not touched |
| `GET /api/core/students?query=` | part of a login or of "First Last" | `200 StudentSummary[]`: student accounts only, letter case and Polish diacritics ignored (`wojcik` finds "Wójcik"), alphabetical, at most 10; empty for a query shorter than 2 characters; `400` query longer than 100 characters |

A student can be in many groups. Students already in a group are still returned by the search; the frontend marks
them.

```json
// GroupSummary
{ "id": "<uuid>", "name": "Algorytmy – grupa 1", "studentCount": 12, "createdAt": "2026-11-18T09:00:00+00:00" }

// GroupDetail: students in Polish alphabetical order of their names
{
  "id": "<uuid>",
  "name": "Algorytmy – grupa 1",
  "createdAt": "2026-11-18T09:00:00+00:00",
  "students": [{ "id": "<uuid>", "login": "kwojcik", "displayName": "Katarzyna Wójcik", "addedAt": "2026-11-18T10:15:00+00:00" }]
}

// GroupStudent: one item of GroupDetail.students
// StudentSummary: { "id": "<uuid>", "login": "kwojcik", "displayName": "Katarzyna Wójcik" }
```

Game checks that a group is the caller's by calling `GET /api/core/groups/{groupId}` with the caller's token: `200`
means it is, `401`/`403`/`404` that it is not.

### Student profile, student groups and group roster

A student's nickname is the only name other students ever see (rankings, FR-21, NFR-03). It is `null` until the student
sets it and is never replaced by a name or login.

| Endpoint | Who | Request | Responses |
|---|---|---|---|
| `GET /api/core/me/profile` | student | — | `200 StudentProfile` |
| `PUT /api/core/me/profile` | student | `{ "nickname" }` | `200 StudentProfile` with the nickname as stored (trimmed); `400` invalid nickname (`errors.Nickname`); `409 Profile.NicknameTaken` another account has it in any letter case |
| `GET /api/core/me/groups` | student | — | `200 MyGroup[]`: the groups the caller is a member of, in Polish alphabetical order like the teacher's list; `[]` when none |
| `GET /api/core/groups/{groupId}/roster` | the group's teacher or a student in it | — | `200 RosterEntry[]`: current members only; `404 Groups.NotFound` missing or deleted group, another teacher's group, a group the student is not in, or an id that is not a UUID |

Other roles get `403` (admins too, also for the roster), `401` without a token. `GET`/`PUT /me/profile` also answer
`401 Auth.SessionUserNotFound` when the account was deleted after login.

**Nickname rules.** Trimmed and composed to Unicode NFC first, then 3–24 characters: letters (with their combining
marks) and digits of any script, spaces, `_`, `-` and `.`; it starts and ends with a letter or digit. Unique across the
whole system ignoring letter case (`Cichy Lis` blocks `cichy lis` and `CICHY LIS`, `ВОЛК` blocks `волк`), but not
ignoring accents (`Kret` and `Krét` are different). A deleted account keeps its nickname, because it is restored on
re-import. Only students set one; saving one's own nickname again, or with other letter case, is allowed.

```json
// StudentProfile
{ "nickname": "Cichy Lis" }          // { "nickname": null } until set

// MyGroup
{ "id": "<uuid>", "name": "Algorytmy – grupa 1", "teacherName": "Jan Kowalski", "joinedAt": "2026-11-18T10:15:00+00:00" }

// RosterEntry: by nickname in Polish alphabetical order, students without one last; no names or logins
{ "studentId": "<uuid>", "nickname": "Cichy Lis" }

// 400 from PUT /me/profile
{ "title": "Validation Failed", "status": 400, "errors": { "Nickname": ["Nickname must have 3 to 24 characters: …"] } }
```

Game checks that a student or teacher belongs to a group by calling `GET /api/core/groups/{groupId}/roster` with the
caller's token: `200` means they do (a student finds their own id, the token's `sub`, in the list), `401`/`403`/`404`
that they do not. The same list gives the nicknames for rankings.

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

### Group student points

These endpoints require a teacher JWT. Core verifies that the teacher owns the group and that the student currently
belongs to it. Use the UUIDs returned by Core for `{groupId}` and `{studentId}`.

| Endpoint | Request | Success |
|---|---|---|
| `POST /api/game/groups/{groupId}/students/{studentId}/rewards` | `{ "points": 20, "reason": "Class participation" }`; `reason` is optional (up to 200 characters) | `201`, the saved reward |
| `GET /api/game/groups/{groupId}/students/{studentId}/rewards` | — | `200`, reward history, newest first (or `[]`) |
| `GET /api/game/groups/{groupId}/students/{studentId}/progress` | — | `200`, `{ "groupId": "<uuid>", "studentId": "<uuid>", "balance": 100, "rank": { "name": "Giermek", "threshold": 100 } }` |

Each reward contains `id`, `points`, `reason`, `studentId`, `awardedBy` (teacher ID) and `createdAt` (UTC timestamp).
Points must be a positive JSON integer. The reward and balance are saved together; an invalid award changes neither.
Both an individual award and the resulting balance must fit within 2,147,483,647 points.

Balance starts at `0` and is separate for each student and group. The rank is the highest threshold at or below the
current balance using that group's configuration. If no threshold qualifies, `rank` is `null`.

Errors: `400` invalid award or balance limit exceeded, `401` missing or invalid JWT, `403` non-teacher,
`404` missing/foreign group or student not in the group, `503` Core unavailable.

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

Core issues the tokens (login, refresh, logout, `/me`), imports accounts, keeps the teachers' groups and the students'
nicknames, and lists a student's groups and a group's roster; Game verifies the same tokens.
Both use the same `JWT_SECRET` (Core: `Jwt__Secret`), issuer `questclass-core`, audience `questclass` and
`HS256` — checked end to end: a token from Core is accepted by `GET /api/game/auth/me/` with the same user id
and role.
