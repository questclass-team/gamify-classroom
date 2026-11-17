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

## Adding the core or game service

nginx already routes to them. Keep `condition: service_healthy`: a plain `depends_on` only waits for the
container to start, not for PostgreSQL to accept connections. Add a block like this to `docker-compose.yml` (core shown; game listens on `8000`):

```yaml
  core:
    <<: *defaults  # restart policy, no-new-privileges, log rotation
    build: services/core
    environment:
      ConnectionStrings__Default: Host=postgres;Database=${POSTGRES_DB:-questclass};Username=core_user;Password=${CORE_DB_PASSWORD}
      Ldap__Host: ldap
      Ldap__BaseDn: ${LDAP_BASE_DN:-dc=labs,dc=questclass,dc=test}
    depends_on:
      postgres:
        condition: service_healthy
      ldap:
        condition: service_healthy
    healthcheck:
      # The .NET runtime image has no curl/wget: install one in the Dockerfile or use another probe.
      test: ["CMD", "curl", "-fs", "http://127.0.0.1:8080/health/live"]
```

Setting names are examples; use whatever the service reads. Inside Docker the hosts are `postgres:5432` and
`ldap:389`; from your machine they are `localhost:${POSTGRES_PORT}` and `localhost:${LDAP_PORT}`.
