# Nx React + Nest starter

A strict Nx monorepo with a static React client, a Fastify-powered Nest API, PostgreSQL with pgvector, checked-in Drizzle migrations, and shared Zod runtime contracts.

## Prerequisites

- Node.js 24.20.0 (the supported policy is `>=24.15.0 <25`)
- Corepack
- Docker Engine or a compatible container runtime

```bash
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm install --frozen-lockfile
```

## First run

```bash
pnpm dev:setup
pnpm dev
```

Open the web app at <http://localhost:4200>. The API is at <http://localhost:3000/api>; Swagger UI is at <http://localhost:3000/api/docs> in local development. Vite proxies `/api` to the API so browser code always uses a same-origin URL.

Configuration may be supplied through the environment or `apps/api/.env`; see `apps/api/.env.example`. `DATABASE_URL` is used by the API. `MIGRATION_DATABASE_URL` may separately restrict migration credentials and falls back to `DATABASE_URL` locally.

## Database and contracts

```bash
pnpm migration:generate  # create a migration to review and commit
pnpm migration:check     # fail if the Drizzle schema and migrations drift
pnpm migrate             # apply committed migrations
pnpm db:down             # stop PostgreSQL; retain its data
pnpm db:reset            # WARNING: delete this repo's local DB volume, recreate, migrate

pnpm contracts:generate  # OpenAPI JSON, then browser TypeScript declarations
pnpm contracts:check     # regenerate and fail if committed output drifts
pnpm routes:check        # regenerate the TanStack route tree and check drift
```

Shared Zod schemas are the payload source of truth. OpenAPI is generated from API decorators backed by those schemas; browser declarations come from committed OpenAPI. Endpoint wrappers still parse network responses at runtime.

## Quality and tests

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e:api
pnpm e2e:web
pnpm build
pnpm ci
```

The API E2E suite uses Testcontainers. With a Podman-backed Docker endpoint that cannot start Ryuk, use `TESTCONTAINERS_RYUK_DISABLED=true pnpm e2e:api`; the suite still performs explicit cleanup. Browser E2E owns a dedicated Compose database and volume and removes them on exit.

## Production artifacts

- `pnpm nx build web` creates static files in `dist/apps/web`. The static host must serve `index.html` as the fallback for client routes, while the edge routes `/api` before that fallback.
- `pnpm nx build api` creates the server bundle in `dist/apps/api`.
- `pnpm image:smoke` builds `Dockerfile.api`, runs its one-shot `node migrate.js` command, and verifies liveness. The image runs as the non-root `node` user.

A deployment platform must inject secrets, serialize the migration job, run it before rollout, wire readiness/liveness probes, and configure same-origin static/API routing. Those platform policies are intentionally not faked in provider-neutral files.

## Intentional non-goals

This starter contains no sample business domain, authentication policy, logging/telemetry stack, deployment hooks, or generated duplicate runtime schemas. Add those where the product and platform requirements are known.

See [the architecture notes](docs/architecture.md) and [the detailed build guide](nx-react-nest-starter-build-guide.md).
