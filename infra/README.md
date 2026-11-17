# Infrastructure

Docker setup for local development: nginx reverse proxy, test LDAP, PostgreSQL init.
Owner: Kajetan.

| Folder | What it is |
|---|---|
| `nginx/` | Image that builds the frontend and serves it; proxies `/api/core/` → `core:8080` and `/api/game/` → `game:8000` |
| `ldap/` | Own OpenLDAP image (Alpine) standing in for the faculty LABS domain, seeded with test accounts |
| `postgres/init/` | Runs once on an empty volume: schemas `core` and `game`, each owned by its own login role |

## nginx

- Prefixes are **not stripped**: `/api/core/groups` reaches core as `/api/core/groups`. Each service owns its prefix.
- Services' `/health/*` endpoints are not proxied; they are for Docker health checks only.
- While core or game is not running, its routes return `503` (problem details JSON). Other `/api/*` paths return `404`.
- Any other path falls back to `index.html`, so frontend routes survive a page refresh.

## PostgreSQL

| Role | Password (`.env`) | Can use |
|---|---|---|
| `core_user` | `CORE_DB_PASSWORD` | schema `core` only |
| `game_user` | `GAME_DB_PASSWORD` | schema `game` only |
| `postgres` | `POSTGRES_PASSWORD` | everything (admin only, not for services) |

Each role's `search_path` is its schema, so unqualified tables land there. The init script runs only on an empty
volume; after changing it run `docker compose down -v`.

## LDAP

- Base DN `dc=labs,dc=questclass,dc=test`; users are `uid=<login>,ou=people,<base DN>`.
- Accounts come from [`ldap/sample-import.csv`](ldap/sample-import.csv) (also the sample file for the admin CSV
  import) and [`ldap/ldap-only.csv`](ldap/ldap-only.csv) (in LDAP but never imported). All passwords: `haslo`.
- Entries have `uid`, `givenName`, `sn`, `cn`, `displayName`. No roles: those come from the CSV import into core.
- Anonymous read is allowed, passwords are bind-only. Admin DN: `cn=admin,<base DN>`, password `LDAP_ADMIN_PASSWORD`.
- Seeded only on an empty volume. After editing the CSV files run `docker compose down -v`.

```sh
ldapwhoami -x -H ldap://localhost:389 -D "uid=student,ou=people,dc=labs,dc=questclass,dc=test" -w haslo
```

## Smoke test

[`smoke-test.sh`](smoke-test.sh) checks a running stack: frontend and SPA routes, API routing, LDAP logins and
schema permissions. CI runs it on every PR that touches infra, the frontend or core.

```sh
docker compose up --build --wait && infra/smoke-test.sh
```

## Running a service locally against this database

Use the Compose database instead of starting another PostgreSQL container, so there is one database per
machine and it has the same schemas and permissions as in CI:

```sh
docker compose up -d --wait postgres ldap
```

Connect as the service's own role, e.g. for core (port and password from your `.env`):

```
ConnectionStrings__Core="Host=localhost;Port=5432;Database=questclass;Username=core_user;Password=core-dev-password"
```

Core's migrations are applied manually: `dotnet ef database update --project src` from `services/core`.
CI applies them the same way against the Compose database, so a migration that needs more than
`core_user`'s rights fails there.

## Game service

The Game service is included in the Compose stack and listens on port `8000`
inside the Compose network. It depends on a healthy PostgreSQL container and
connects as `game_user` to the `game` schema. It is reached through nginx at
`/api/game/`.

```sh
docker compose up -d --build game
./services/game/scripts/manage.sh migrate
```

The service uses `DB_HOST=postgres`, `DB_PORT=5432`, `DB_USER=game_user` and
`GAME_DB_PASSWORD` from `.env`. Do not use the administrator `postgres` role
from an application container.

## Adding the Core service

nginx already routes to Core. Keep `condition: service_healthy`: a plain
`depends_on` only waits for the container to start, not for PostgreSQL to
accept connections. Add a block like this to `docker-compose.yml`:

```yaml
  core:
    <<: *defaults  # restart policy, no-new-privileges, log rotation
    build: services/core
    environment:
      ConnectionStrings__Core: Host=postgres;Database=${POSTGRES_DB:-questclass};Username=core_user;Password=${CORE_DB_PASSWORD}
      Ldap__Host: ldap
      Ldap__BaseDn: ${LDAP_BASE_DN:-dc=labs,dc=questclass,dc=test}
    depends_on:
      core-migrate:
        condition: service_completed_successfully
      ldap:
        condition: service_healthy
    healthcheck:
      # /health/ready also checks the database. The .NET runtime image has no curl/wget:
      # install one in the Dockerfile or use another probe.
      test: ["CMD", "curl", "-fs", "http://127.0.0.1:8080/health/ready"]
```

Core does not apply migrations on startup, so the stack needs a one-shot `core-migrate` service (for example an
SDK build stage running `dotnet ef database update`, or a `dotnet ef migrations bundle`) that depends on
`postgres: condition: service_healthy` and exits when done; `core` then waits for it with
`service_completed_successfully` as above.

Other setting names are examples; use whatever the service reads. Inside Docker the hosts are `postgres:5432`
and `ldap:389`; from your machine they are `localhost:${POSTGRES_PORT}` and `localhost:${LDAP_PORT}`.
