# Core service (ASP.NET Core)

Identity and groups: LDAP login, JWT, roles, CSV account import, class groups, student profiles.
Owner: Kiryl.

**Stack:** C#, .NET 10, ASP.NET Core (controllers), FluentValidation, Serilog, Swashbuckle, xUnit.

## Run locally

Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0). From `services/core`:

```sh
dotnet run --project src
```

| What | URL |
|---|---|
| API docs (Swagger UI) | http://localhost:5069/api/core/swagger |
| OpenAPI document | http://localhost:5069/api/core/swagger/v1/swagger.json |
| Liveness check | http://localhost:5069/health/live |

## Tests and formatting

```sh
dotnet test                                # unit + integration tests
dotnet format --verify-no-changes          # code style check (the same one CI runs)
dotnet format                              # fix code style
```

Integration tests start the whole API in memory with `WebApplicationFactory`; nothing else has to run.

## Structure

```
QuestClass.Core.slnx
src/                        QuestClass.Core (web API)
  Common/
    Api/                    ApiControllerBase, ValidationFilter, GlobalExceptionHandler
    Results/                Result, Error, ErrorType
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
- Code style is enforced by `.editorconfig` (block-scoped namespaces, braces, `_camelCase` private fields).

## Behind nginx

All API routes, including Swagger, already start with `/api/core`. The reverse proxy must forward
`/api/core/` to this service **without stripping the prefix**. `/health/live` is outside the prefix on
purpose: it is meant for container health checks inside the Docker network, not for the public proxy.

## Configuration

Settings come from `appsettings.json` and can be overridden with environment variables, using `__` as the
section separator (for example `Serilog__MinimumLevel__Default=Debug`).
