#!/usr/bin/env bash
set -euo pipefail

migrations_directory="libs/api/database/drizzle"
temporary_directory="$(mktemp -d)"
cleanup() {
  rm -rf "$temporary_directory"
}
trap cleanup EXIT INT TERM

cp -R "$migrations_directory" "$temporary_directory/drizzle"
pnpm migration:generate
diff -ru "$temporary_directory/drizzle" "$migrations_directory"
