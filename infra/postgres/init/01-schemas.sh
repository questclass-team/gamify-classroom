#!/bin/sh
# Runs once, when the postgres volume is empty (docker-entrypoint-initdb.d).
# Creates one schema per service, each owned by its own login role, so a service
# can only read and write its own schema. Reset with `docker compose down -v`.
set -eu

psql --variable ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set db="$POSTGRES_DB" \
  --set core_password="$CORE_DB_PASSWORD" \
  --set game_password="$GAME_DB_PASSWORD" <<'SQL'
-- Nobody gets default access to the database or the public schema.
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

CREATE ROLE core_user LOGIN PASSWORD :'core_password';
CREATE ROLE game_user LOGIN PASSWORD :'game_password';
GRANT CONNECT ON DATABASE :"db" TO core_user, game_user;

-- The owner of a schema is the only role that can use it.
CREATE SCHEMA core AUTHORIZATION core_user;
CREATE SCHEMA game AUTHORIZATION game_user;

-- Unqualified table names (EF Core, Django) land in the service's own schema.
ALTER ROLE core_user SET search_path = core;
ALTER ROLE game_user SET search_path = game;
SQL
