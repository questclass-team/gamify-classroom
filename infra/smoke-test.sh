#!/bin/sh
# Checks a running stack: `docker compose up --build --wait`, then `infra/smoke-test.sh`.
# CI runs exactly this script; exits non-zero when any check fails.
set -eu
cd "$(dirname "$0")/.."

if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
fi
base="http://localhost:${NGINX_PORT:-8080}"
people="ou=people,${LDAP_BASE_DN:-dc=labs,dc=questclass,dc=test}"
failed=0

pass() { echo "ok    $1"; }
fail() { echo "FAIL  $1"; failed=1; }

# $1 path, $2 expected status
expect_status() {
    status=$(curl -s -o /dev/null -w '%{http_code}' "$base$1")
    if [ "$status" = "$2" ]; then pass "GET $1 -> $status"; else fail "GET $1 -> $status (expected $2)"; fi
}

# API prefixes must reach the services, never fall back to the frontend's index.html.
expect_not_frontend() {
    type=$(curl -s -o /dev/null -w '%{content_type}' "$base$1")
    case "$type" in
        text/html*) fail "GET $1 returned the frontend page, not the API" ;;
        *) pass "GET $1 is routed to the API ($type)" ;;
    esac
}

expect_status / 200
expect_status /teacher/groups/1 200
expect_status /api/unknown 404
expect_not_frontend /api/core/groups
expect_not_frontend /api/game/groups

if docker compose exec -T ldap ldapwhoami -x -H ldap://127.0.0.1 \
    -D "uid=student,$people" -w "${LDAP_TEST_USER_PASSWORD:-haslo}" > /dev/null 2>&1; then
    pass "LDAP login with the test password"
else
    fail "LDAP login with the test password"
fi
if docker compose exec -T ldap ldapwhoami -x -H ldap://127.0.0.1 \
    -D "uid=student,$people" -w wrong-password > /dev/null 2>&1; then
    fail "LDAP accepted a wrong password"
else
    pass "LDAP rejects a wrong password"
fi

core_psql() {
    docker compose exec -T -e PGPASSWORD="${CORE_DB_PASSWORD:-}" postgres \
        psql -h 127.0.0.1 -U core_user -d "${POSTGRES_DB:-questclass}" -Atc "$1"
}
if [ "$(core_psql 'select current_schema()' 2> /dev/null)" = core ]; then
    pass "core_user works in schema core"
else
    fail "core_user cannot use schema core"
fi
if core_psql 'create table game.smoke_test (id int)' > /dev/null 2>&1; then
    fail "core_user could write to schema game"
else
    pass "core_user is denied schema game"
fi

exit "$failed"
