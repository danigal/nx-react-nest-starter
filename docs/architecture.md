# Architecture

## Responsibility map

```text
apps/web ───────────────► libs/shared/contracts
apps/api ─► libs/api/application ─► libs/api/database
                    └──────────────► libs/shared/contracts
web-e2e ─► web + api              api-e2e ─► api
```

`web` owns browser composition, routing, queries, themes, and source-owned UI components. `api` owns the executable and composition root. `api-application` owns HTTP policy, health behavior, configuration, and the public application factory. `api-database` is the PostgreSQL/Drizzle adapter and owns committed migrations. `shared-contracts` contains platform-neutral Zod payload schemas only.

Nx tags enforce these seams: browser projects may depend only on browser or agnostic code; agnostic contracts cannot depend on Node/browser code; web scope cannot reach API scope; API libraries may use API and shared scope. Prefer deep libraries with a stable public seam. A new feature normally starts as a cohesive module inside the existing application library, not as one Nx project per endpoint.

## Contracts and runtime validation

```text
shared Zod schemas → Nest DTO/OpenAPI metadata → committed openapi.json
                                             → generated browser api.d.ts
network response → endpoint wrapper → shared Zod parse → query/UI
```

Zod schemas define runtime payload truth. Nest validation and serialization reject invalid inputs and outputs. The generated TypeScript file improves authoring but is not trusted at runtime: the browser client parses each response at the network boundary. `pnpm contracts:check` detects drift in both committed generated artifacts.

## API composition and health

`createApiApplication()` is the reusable composition seam used by the executable, OpenAPI generation, and E2E tests. It installs the Fastify adapter, global prefix, Zod validation/serialization, safe Problem Details responses, optional docs, and shutdown hooks. Database creation is injected so tests can substitute only the adapter boundary.

`/api/health/live` proves the process can serve requests and never queries PostgreSQL. `/api/health/ready` performs a bounded database check; database failure produces a safe `503`, while liveness remains `200`.

## Migrations

The database library owns append-only SQL under `libs/api/database/drizzle`. API startup never changes schema. Local setup, tests, and deployment jobs all call the same migrator. Production should use a separately scoped `MIGRATION_DATABASE_URL`, serialize one migration job, then roll application instances.

For incompatible changes use expand/contract: deploy additive schema, deploy code that tolerates both forms, backfill, switch reads and writes, then remove old schema in a later release.

## Topologies

```text
Local:      browser → Vite :4200 ─/api→ Nest :3000 → Compose PostgreSQL :5432
Tests:      Playwright → Vite ─/api→ Nest → dedicated Compose PostgreSQL :55432
            Jest/Fastify inject → Nest → per-suite Testcontainers PostgreSQL
Production: browser → static host/edge ─/api→ API replicas → managed PostgreSQL
                         └─ SPA fallback      ▲
                 serialized migration job ───┘
```

The production web build is environment-neutral. The static host must fall back to `index.html` for client routes, and the edge must match `/api` before applying that fallback. Secrets, probe wiring, rollout ordering, and migration-job serialization remain deployment-platform responsibilities.
