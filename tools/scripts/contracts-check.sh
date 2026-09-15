#!/usr/bin/env bash
set -euo pipefail

temporary_directory="$(mktemp -d)"
cleanup() {
  rm -rf "$temporary_directory"
}
trap cleanup EXIT INT TERM

cp apps/api/openapi/openapi.json "$temporary_directory/openapi.json"
cp apps/web/src/generated/api.d.ts "$temporary_directory/api.d.ts"

pnpm contracts:generate

cmp "$temporary_directory/openapi.json" apps/api/openapi/openapi.json
cmp "$temporary_directory/api.d.ts" apps/web/src/generated/api.d.ts
