#!/usr/bin/env bash
set -euo pipefail

image="nx-react-nest-starter-api:verify"
container="nx-react-nest-starter-api-smoke"
database_url="postgresql://postgres:postgres@127.0.0.1:55432/nx_react_nest_e2e"

cleanup() {
  docker rm --force "$container" >/dev/null 2>&1 || true
  docker compose -f compose.e2e.yaml down --volumes --remove-orphans
}
trap cleanup EXIT INT TERM

cleanup
docker build --load -f Dockerfile.api -t "$image" .
docker compose -f compose.e2e.yaml up --detach --wait postgres-e2e
docker run --rm --network host \
  --env MIGRATION_DATABASE_URL="$database_url" \
  --env DATABASE_URL="$database_url" \
  "$image" node migrate.js
docker run --detach --name "$container" --network host \
  --env DATABASE_URL="$database_url" \
  --env API_HOST=127.0.0.1 \
  --env API_PORT=3000 \
  "$image" >/dev/null

for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:3000/api/health/live >/dev/null; then
    docker stop --time 10 "$container" >/dev/null
    exit_code="$(docker inspect --format '{{.State.ExitCode}}' "$container")"
    if [ "$exit_code" -eq 0 ]; then
      exit 0
    fi
    docker logs "$container"
    exit 1
  fi
  sleep 1
done

docker logs "$container"
exit 1
