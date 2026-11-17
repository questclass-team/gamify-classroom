# Core service (ASP.NET Core)

Identity and groups: LDAP login, JWT, roles, CSV account import, class groups, student profiles.
Owner: Kiryl.

**Stack:** C#, .NET 10, ASP.NET Core (controllers), FluentValidation, Serilog, Swashbuckle, xUnit.

## Run locally

Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) and Docker.

1. Start a local PostgreSQL once (the credentials match `appsettings.Development.json`, they are dummy
   values for local development only). It uses host port **5433** so it does not clash with a PostgreSQL
   installed directly on the machine or the one from `docker compose`:

   ```sh
   docker run -d --name questclass-postgres -e POSTGRES_USER=questclass -e POSTGRES_PASSWORD=questclass -e POSTGRES_DB=questclass -p 5433:5432 postgres:17-alpine
   ```

   Later just `docker start questclass-postgres`.

2. Create or update the database tables (migrations are never applied automatically on startup):

   ```sh
   dotnet tool restore
   dotnet ef database update --project src
   ```

3. Run the API from `services/core`:

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
    Api/                    ApiControllerBase, ValidationFilter, GlobalExceptionHandler
    Configuration/          options classes and their validators
    Persistence/            CoreDbContext, entity configurations, soft delete
    Results/                Result, Error, ErrorType
  Entities/                 database entities (User, Role, ...)
  Repositories/             IXxxRepository + EF Core implementation
  Features/<Feature>/<Use case>/
                            one folder per endpoint: XxxEndpoint, XxxRequest, XxxHandler, XxxValidator
  Program.cs
tests/
  QuestClass.Core.UnitTests/
  QuestClass.Core.IntegrationTests/
```

The service uses **vertical slices**: everything one endpoint needs lives in its own folder under
`Features/`. Code shared by several slices goes to `Features/<Feature>/Shared/`.

## Conventions

- **One controller class per endpoint**, derived from `ApiControllerBase` (e.g. `LoginEndpoint`).
- **Handlers** return `Result` / `Result<T>` instead of throwing for expected failures. The endpoint calls
  `HandleFailure(result)`, which maps `ErrorType` to the HTTP status:

  | ErrorType | Status |
  |---|---|
  | `Validation` | 400 |
  | `Unauthorized` | 401 |
  | `Forbidden` | 403 |
  | `NotFound` | 404 |
  | `Conflict` | 409 |

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
| `ConnectionStrings__Core` | yes | `Host=postgres;Port=5432;Database=questclass;Username=questclass;Password=...` |

All tables of the service, including the EF Core migrations history, live in the `core` PostgreSQL schema.
