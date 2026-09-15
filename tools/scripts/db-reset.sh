#!/usr/bin/env bash
set -euo pipefail

echo 'WARNING: deleting the nx-react-nest-starter local PostgreSQL volume.' >&2
docker compose down --volumes
docker compose up --detach --wait postgres
pnpm migrate
