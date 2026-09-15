#!/usr/bin/env bash
set -euo pipefail

compose_file="compose.e2e.yaml"
database_url="postgresql://postgres:postgres@127.0.0.1:55432/nx_react_nest_e2e"

cleanup() {
  docker compose -f "$compose_file" down --volumes --remove-orphans
}
trap cleanup EXIT INT TERM

cleanup
docker compose -f "$compose_file" up --detach --wait postgres-e2e
DATABASE_URL="$database_url" MIGRATION_DATABASE_URL="$database_url" pnpm migrate
pnpm nx run web-e2e:e2e-raw --skip-nx-cache
