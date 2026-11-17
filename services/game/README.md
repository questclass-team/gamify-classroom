# Game service (Django REST)

Gamification logic: configuration, rewards, rankings, shop, export.
Owners: Piotr, Artem, Mykyta.

## Run with Docker Compose

From the repository root:

```sh
docker compose up -d --build
./services/game/scripts/manage.sh migrate
./services/game/scripts/manage.sh check
```

The service listens on port `8000` inside the Compose network and is exposed
through nginx at:

```text
http://localhost:8080/api/game/
```

Game uses the PostgreSQL `game` schema through the restricted `game_user`
role. Inside Docker the database host is `postgres` and the database port is
`5432`; the host port is configured by `POSTGRES_PORT` in `.env`.

## Django management commands

Run Django commands from the repository root with:

```sh
./services/game/scripts/manage.sh check
./services/game/scripts/manage.sh migrate
```

The script passes all arguments to `uv run python manage.py` inside a temporary
Compose container.

## JWT authentication

Game validates access tokens issued by Core. It does not issue or refresh
tokens. Tokens use `HS256`, the `questclass-core` issuer and the `questclass`
audience, and include `sub`, `login`, `name`, `role`, `iat`, `nbf`, `exp` and
`jti` claims.

Core and Game must receive the same `JWT_SECRET` value. In Docker, Core maps
this value to `Jwt__Secret`, while Game uses it as the SimpleJWT signing key.
Use a random secret of at least 32 bytes outside local development and never
commit it or `.env`.

See the complete endpoint and JWT contract in [`docs/api.md`](../../docs/api.md).

## Tests and formatting

```sh
uv run ruff check .
uv run ruff format --check .
uv run pytest
```
