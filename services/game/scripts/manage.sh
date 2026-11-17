#!/usr/bin/env bash
set -euo pipefail

# Docker Desktop on Windows/MSYS may otherwise rewrite /app as a host path.
export MSYS_NO_PATHCONV=1

docker compose run --rm -w /app game uv run python manage.py "$@"
