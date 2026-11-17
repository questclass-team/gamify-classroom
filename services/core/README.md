# Core service (ASP.NET Core)

Identity and groups: LDAP login, JWT, roles, CSV account import, class groups, student profiles.
Owner: Kiryl.

**Stack:** C#, .NET 10, ASP.NET Core (controllers), FluentValidation, Serilog, Swashbuckle, xUnit.

## Run in Docker

`docker compose up --build` from the repository root starts the whole stack with core. Swagger UI:
http://localhost:8080/api/core/swagger (through nginx). The [`Dockerfile`](Dockerfile) has two targets:

| Target | Compose service | What it is |
|---|---|---|
| `final` | `core` | The API on `aspnet:10.0-alpine`, non-root, health check on `/health/ready` |
| `migrate` | `core-migrate` | SDK image that runs `dotnet ef database update` once as `core_user` and exits |

After changing code, `docker compose up -d --build core` rebuilds both and applies new migrations.

## Run locally

Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) and Docker.

1. Start a local PostgreSQL once (the credentials match `appsettings.Development.json`, they are dummy
   values for local development only). It uses host port **5433** so it does not clash with a PostgreSQL
   installed directly on the machine or the one from `docker compose`:

   ```sh
   docker run -d --name questclass-postgres -e POSTGRES_USER=questclass -e POSTGRES_PASSWORD=questclass -e POSTGRES_DB=questclass -p 5433:5432 postgres:17-alpine
   ```

   Later just `docker start questclass-postgres`.

2. Start the test LDAP directory (from the repository root; it is the `ldap` service of the shared
   `docker-compose.yml`, test accounts in `infra/ldap/*.csv`, every password `haslo`):

   ```sh
   cp .env.example .env
   docker compose up -d ldap
   ```

3. Create or update the database tables (migrations are never applied automatically on startup):

   ```sh
   dotnet tool restore
   dotnet ef database update --project src
   ```

4. Run the API from `services/core`:

   ```sh
   dotnet run --project src
   ```

| What | URL |
|---|---|
| API docs (Swagger UI) | http://localhost:5069/api/core/swagger |
| OpenAPI document | http://localhost:5069/api/core/swagger/v1/swagger.json |
| Liveness check (process is up) | http://localhost:5069/health/live |
| Readiness check (database is reachable) | http://localhost:5069/health/ready |

## Tests and formatting

```sh
dotnet test                                # unit + integration tests
dotnet format --verify-no-changes          # code style check (the same one CI runs)
dotnet format                              # fix code style
```

Integration tests need **Docker running**. They start a throwaway PostgreSQL container
(Testcontainers), apply the real migrations to it and run the whole API in memory with
`WebApplicationFactory`. Tables are emptied before every test (Respawn), and the container is removed
after the run. The local `questclass-postgres` database is never touched by tests.

## Database migrations

`dotnet-ef` is pinned in `dotnet-tools.json`; run `dotnet tool restore` once. From `services/core`:

| Task | Command |
|---|---|
| Add a migration after changing entities or configurations | `dotnet ef migrations add <Name> --project src --output-dir Common/Persistence/Migrations` |
| Apply migrations to the database from `ConnectionStrings:Core` | `dotnet ef database update --project src` |
| Check that no model change is missing a migration (CI) | `dotnet ef migrations has-pending-model-changes --project src` |
| SQL script for a database administrator | `dotnet ef migrations script --project src --idempotent` |

Migration files are generated code: do not edit them by hand and do not reformat them.

## Structure

```
QuestClass.Core.slnx
src/                        QuestClass.Core (web API)
  Common/
    Api/                    ApiControllerBase, ValidationFilter, GlobalExceptionHandler, AddApi()
    Configuration/          options classes and their validators
    Persistence/            CoreDbContext, entity configurations, soft delete, AddPersistence()
    Results/                Result, Error, ErrorType
  Entities/                 database entities (User, Role, ...)
  Repositories/             IXxxRepository + EF Core implementation
  Features/<Feature>/
    <Use case>/             one folder per endpoint: XxxEndpoint, XxxRequest, XxxHandler, XxxValidator
    Shared/                 code used by several use cases of the feature
    <Feature>ServiceCollectionExtensions.cs
                            Add<Feature>Feature(): registers the feature's handlers and services
  Program.cs                logging, the Add...() calls and the HTTP pipeline only
tests/
  QuestClass.Core.UnitTests/
  QuestClass.Core.IntegrationTests/
```

The service uses **vertical slices**: everything one endpoint needs lives in its own folder under
`Features/`. Code shared by several slices goes to `Features/<Feature>/Shared/`.

## Conventions

- **One controller class per endpoint**, derived from `ApiControllerBase` (e.g. `LoginEndpoint`).
- **Registration:** a new handler is registered in its feature's `<Feature>ServiceCollectionExtensions`, a new
  repository in `AddPersistence()`; a new feature adds one `Add<Feature>Feature()` call to `Program.cs`.
- **Handlers** return `Result` / `Result<T>` instead of throwing for expected failures. The endpoint calls
  `HandleFailure(result)`, which maps `ErrorType` to the HTTP status:

  | ErrorType | Status |
  |---|---|
  | `Validation` | 400 |
  | `Unauthorized` | 401 |
  | `Forbidden` | 403 |
  | `NotFound` | 404 |
  | `Conflict` | 409 |
  | `TooLarge` | 413 |

- **Request validation** lives only in FluentValidation validators. They are picked up automatically and
  run before the endpoint by `ValidationFilter`.
- **Every error** is returned as RFC 9457 problem details (`application/problem+json`) with `title`,
  `status`, `detail`, `instance` and `traceId`. Unhandled exceptions become a generic 500 without
  internal details.
- **Database access** goes through repositories only; handlers never use `CoreDbContext` directly.
- **Soft delete:** an entity that implements `ISoftDeletable` is never physically deleted. `Remove` +
  `SaveChanges` only marks it, and it is hidden from all queries by the `SoftDelete` query filter
  (`IgnoreQueryFilters([QueryFilters.SoftDelete])` to see it). Never use `ExecuteDelete` on such entities:
  it bypasses the soft delete interceptor.
- Tables and columns use `snake_case` (`core.users.first_name`).
- Code style is enforced by `.editorconfig` (block-scoped namespaces, braces, `_camelCase` private fields).

## Behind nginx

All API routes, including Swagger, already start with `/api/core`. The reverse proxy must forward
`/api/core/` to this service **without stripping the prefix**. `/health/live` is outside the prefix on
purpose: `/health/live` and `/health/ready` are meant for container health checks inside the Docker
network, not for the public proxy.

## Configuration

Settings come from `appsettings.json` and can be overridden with environment variables, using `__` as the
section separator (for example `Serilog__MinimumLevel__Default=Debug`). The service refuses to start when
a required setting is missing or invalid.

| Environment variable | Required | Example |
|---|---|---|
| `ConnectionStrings__Core` | yes | `Host=postgres;Port=5432;Database=questclass;Username=core_user;Password=...` |
| `Ldap__Host` | yes | `ldap` |
| `Ldap__Port` | no (389) | `636` |
| `Ldap__UseSsl` | no (false) | `true` — use LDAPS for a real directory, the password travels to it |
| `Ldap__BaseDn` | yes | `dc=labs,dc=questclass,dc=test` |
| `Ldap__BindTemplate` | no (`uid={login},ou=people,{baseDn}`) | `{login}@labs.example` (Active Directory UPN) |
| `Ldap__UserFilterTemplate` | no (`(uid={login})`) | `(sAMAccountName={login})` (Active Directory) |
| `Ldap__FirstNameAttribute` / `Ldap__LastNameAttribute` | no (`givenName` / `sn`) | |
| `Ldap__TimeoutSeconds` | no (5) | |
| `Jwt__Secret` | yes, at least 32 bytes, **shared with the game service** | a long random string |
| `Jwt__Issuer` / `Jwt__Audience` | no (`questclass-core` / `questclass`), shared with the game service | |
| `Jwt__AccessTokenLifetimeMinutes` | no (15), at most 480 | |
| `Bootstrap__AdminLogins` | no (none) | `admin` — comma-separated logins that become admins on their first login |
| `RateLimiting__LoginPermitsPerMinute` | no (20) | login attempts per client IP per minute |
| `RefreshToken__SessionLifetimeHours` | no (8), 1–8 | how long a login session lasts; refreshing does not extend it |
| `RefreshToken__ReuseGracePeriodSeconds` | no (30), 0–300 | a just-rotated cookie arriving again within this time is not treated as theft |

## Authentication

- Every endpoint requires a valid access token (`Authorization: Bearer <token>`) unless it is marked
  `[AllowAnonymous]`. Role checks: `[Authorize(Policy = AuthPolicies.Admin)]` (also `Teacher`, `Student`).
- Access tokens are HS256 JWTs. Claims: `sub` (user id), `login`, `name`, `role` (`student` / `teacher` /
  `admin`), `jti`, plus `iss`, `aud`, `iat`, `nbf`, `exp`. The game service validates them with the same
  secret, issuer and audience.
- In Swagger UI use the **Authorize** button and paste the `accessToken` returned by the login endpoint.

### Login (`POST /api/core/auth/login`)

1. The LDAP directory checks the password (it is never stored). Wrong password or unknown login → `401`.
2. Only accounts imported from CSV may log in. Valid in LDAP but not imported → `403`.
3. First and last name are refreshed from LDAP on every login; the role always comes from the database.
4. Returns `{ accessToken, user: { id, login, displayName, role } }` and starts a session: sets the refresh
   cookie (see below), valid for `RefreshToken__SessionLifetimeHours` (8 h).

**First admin.** Accounts are created only by CSV import, which needs an admin. A login listed in
`Bootstrap__AdminLogins` that passes LDAP and has never existed in the database is created as an admin on
its first login (locally: `admin` / `haslo`). A deleted account is never recreated this way.

**Rate limit.** Login attempts are limited per client IP (`429` when exceeded). Behind nginx the client IP
is taken from `X-Forwarded-For`.

### Session: refresh token (`POST /api/core/auth/refresh`, `POST /api/core/auth/logout`)

The access token lives 15 minutes; the session lives up to 8 hours thanks to a refresh token.

- **Where it is.** Only in the cookie `qc_refresh`: `HttpOnly` (JavaScript cannot read it, so XSS cannot steal
  it), `Secure`, `SameSite=Strict`, `Path=/api/core/auth` (the browser sends it to the auth endpoints only).
  Browsers treat `http://localhost` as secure, so it also works locally. The database stores only its
  SHA-256 hash.
- **Refresh.** `POST /api/core/auth/refresh` with no body and no `Authorization` header (the browser sends the
  cookie) returns `{ accessToken, user }` like login and replaces the cookie (**rotation**). The user is read
  from the database again, so a changed role or a deleted account takes effect at the next refresh.
  Refreshing never moves the end of the session.
- **Theft detection.** A rotated cookie that comes back means someone has a copy: every session of that user
  ends (`401`). Exception: within `ReuseGracePeriodSeconds` (30 s) of the rotation it is two tabs refreshing
  at once, so it gets a new access token and the cookie is left alone.
- **Failure.** Missing, unknown, expired, logged-out or reused cookie → `401` `Auth.InvalidRefreshToken`, and
  the cookie is removed. The frontend then shows the login page.
- **Logout.** `POST /api/core/auth/logout` revokes the cookie's session and removes the cookie (`204`). It needs
  no access token and can be called twice. Other sessions of the user (other devices) stay.

In Swagger UI: log in, then call refresh or logout directly; the browser sends the cookie by itself.

## Account import (`POST /api/core/admin/users/import`, admin only)

Accounts are created only this way (FR-04). Upload the CSV as `multipart/form-data`, field `file`:

```csv
login,first_name,last_name,role
jkowalski,Jan,Kowalski,teacher
anowak,Anna,Nowak,student
```

- First line is the header (any letter case); delimiter `;` when the header has it, otherwise `,`; values may
  be quoted as Excel writes them. The file must be **UTF-8** (in Excel: "CSV UTF-8"), at most **1 MB**.
- Roles: `student`, `teacher`, `admin`. Logins are stored lower-case.
- The answer lists every row: `created` (line, login, displayName, role) and `skipped` (line, login, reason).
  Reasons: `missing_field`, `invalid_login` (characters other than letters, digits, `.`, `_`, `-`),
  `invalid_role`, `duplicate_in_file`, `already_exists`. Importing the same file again creates nothing.
- A deleted account in the file is **restored** (same id) and reported as created.
- The whole file is saved in one transaction.
- Errors: `400` no file / wrong header / not UTF-8, `401` no token, `403` not an admin, `413` file too large.

[`infra/ldap/sample-import.csv`](../../infra/ldap/sample-import.csv) is a ready file with the test accounts of
the local LDAP: log in as `admin` / `haslo` (bootstrap admin) and import it to get teachers and students.

## Groups (`/api/core/groups`, teacher only)

A teacher creates groups and sees only their own (FR-06, FR-07). Shapes and status codes: [`docs/api.md`](../../docs/api.md#groups).

- `POST /api/core/groups` creates an empty group (`201`); `GET /api/core/groups` lists the caller's groups with their
  number of students; `GET /api/core/groups/{groupId}` returns one group with its students.
- `GET /api/core/students?query=` finds student accounts to add; `POST /api/core/groups/{groupId}/students`
  `{ studentId }` adds one (`201`, or `200` when already in the group: never a duplicate, also under concurrent
  requests); `DELETE /api/core/groups/{groupId}/students/{studentId}` removes one (`204`, also when not in the group).
  Only active student accounts can be added: teachers, admins and deleted accounts get `404 Groups.StudentNotFound`.
- **Search** ignores letter case and Polish diacritics. `core.users.search_text` is a column generated by PostgreSQL
  (`lower(translate(login || ' ' || first_name || ' ' || last_name, 'ąć…', 'ac…'))`, see `SearchText`), so it follows
  every import, login and restore by itself; the query is folded the same way in C#. No `unaccent` extension is
  needed, which `core_user` could not install. `%` and `_` in a query are matched literally.
- **Another teacher's group is `404`**, the same as a missing one, so a teacher cannot even learn that it exists. The
  game service relies on this: it calls `GET /api/core/groups/{groupId}` with the user's token to check ownership.
- Tables: `groups` (soft-deleted like users) and `group_members`, whose key is the pair (group, student): a student
  can be in many groups, but in one group only once. Deleted student accounts are left out of lists and counts.
- Names (groups, students) are sorted with the Polish ICU collation `pl-x-icu` (`Collations.Polish`). The default
  collation of the Alpine PostgreSQL image sorts by bytes and would put "algorytmy" and "Ćwiczenia" after "Zajęcia".

All tables of the service, including the EF Core migrations history, live in the `core` PostgreSQL schema.
