#!/usr/bin/env bash
set -euo pipefail

temporary_file="$(mktemp)"
cleanup() {
  rm -f "$temporary_file"
}
trap cleanup EXIT INT TERM

cp apps/web/src/routeTree.gen.ts "$temporary_file"
pnpm nx build web
cmp "$temporary_file" apps/web/src/routeTree.gen.ts
