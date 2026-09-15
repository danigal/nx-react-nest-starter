# Nx React/Nest Starter — Build Guide

Status: reusable implementation specification with an implementation record

Reference implementation: `/home/daniel/Projects/nx-react-nest-starter`

Source decisions: `handoff-nx-react-next-starter.md` plus the completed grilling session

## 1. Outcome

Build a reusable, production-oriented Nx integrated monorepo with two independently deployable artifacts:

- `web`: a static React/Vite SPA.
- `api`: a containerized NestJS/Fastify REST API.

The public deployment is same-origin. The browser calls `/api`; an edge router or reverse proxy sends that path to the API service and all other paths to the static web host. Local development preserves the same contract through the Vite proxy.

The repository is an infrastructure starter, not a sample domain application. Its only vertical proof is:

1. liveness and database-backed readiness endpoints;
2. a restrained web shell that queries readiness;
3. unit, API/database E2E, and real-browser E2E coverage of that behavior.

## 2. Non-goals

Do not add:

- authentication or authorization;
- a sample business entity, CRUD flow, vector-search example, or seed data;
- SSR or Next.js;
- GraphQL;
- a logging policy or Pino integration;
- a component catalogue or unused shadcn components;
- Git hooks;
- automatic schema changes during API startup;
- cross-origin deployment support in the initial starter;
- platform-specific Kubernetes, cloud-provider, or static-host manifests;
- placeholder `core`, `common`, `shared-utils`, or per-endpoint libraries.

“Production-oriented” here means that boundaries, configuration, validation, migrations, health semantics, testing, build artifacts, graceful shutdown, and CI are deliberate. It does not claim to provide a complete observability or platform stack.

## 3. Required baseline

- Node.js 24.20.0, with a supported policy of `>=24.15.0 <25`, pinned in `.nvmrc`, CI, and the API image.
- pnpm 11.24.0, pinned as `"packageManager": "pnpm@11.24.0"`; use Corepack to activate it. pnpm 12 was released immediately before this guide and is intentionally not the starter baseline yet.
- Nx 23.1.1, shared exactly by `nx` and every `@nx/*` plugin.
- Strict TypeScript, additionally enabling `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- A committed `pnpm-lock.yaml`.
- PostgreSQL 18 with pgvector 0.8.6, pinned as `pgvector/pgvector:0.8.6-pg18-bookworm` in Compose and tests; never use `latest`.

Use current compatible stable package releases at construction time. Record exact versions in `package.json` and the lockfile rather than copying floating `latest` tags into long-lived scripts. Record version-sensitive primary-source checks under `docs/research/`; do not leave the guide pointing to an unpublished local note.

### Reusing this guide for another project

Treat names and versions in this document as reviewed defaults, not invisible constants. Before running generators, define and record this project's substitutions:

| Guide value                                           | Meaning                                                                    | Adaptation rule                                                                                                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nx-react-nest-starter`                               | workspace, Compose project, volume, image, database, and display-name stem | Replace every occurrence with the new repository's kebab-case name; derive a PostgreSQL-safe snake_case database name separately. Search the entire repository after generation.               |
| `@nx-react-nest-starter/*`                            | TypeScript import namespace                                                | Replace with the new package scope in `tsconfig.base.json`, app-local path overrides, imports, and shadcn aliases. Do not assume changing root `package.json` rewrites paths.                  |
| `web`, `api`                                          | deployable project names                                                   | Keep them for a single web/API starter, or replace them consistently in Nx project names, target references, proxy configuration, output paths, Docker copies, scripts, CI, and documentation. |
| `shared-contracts`, `api-application`, `api-database` | logical library names                                                      | Rename only if the domain language genuinely differs; update tags, TypeScript references, public import paths, and boundary rules as one change.                                               |
| ports `4200`, `3000`, `5432`, `55432`                 | web, API, local DB, isolated E2E DB                                        | Check for conflicts and change Vite, Playwright, Compose, environment examples, smoke scripts, health checks, and docs together.                                                               |
| pinned versions in section 3                          | last verified compatibility set                                            | Re-resolve at project creation time using the version refresh below; never mechanically mix a new framework major into the old matrix.                                                         |

Use a case-sensitive search before the first commit:

```bash
rg -n 'nx-react-nest-starter|nx_react_nest|@nx-react-nest-starter|localhost:4200|127\.0\.0\.1:3000|5432|55432' . \
  --glob '!pnpm-lock.yaml' --glob '!node_modules/**' --glob '!.git/**'
```

The search results are a checklist, not an instruction to replace third-party metadata blindly. In particular, keep `/api` unless the public routing contract itself changes.

Before applying the guide to a new date:

1. Choose one Node release supported by Nx, Nest runtime and schematics, Vite, Playwright, and the package manager. Test the exact container tag as well as the host runtime.
2. Create a disposable workspace with the intended Nx version. Inspect `nx list`, every generator's `--help`, and all dry-run output; generator defaults and accepted flags are versioned behavior.
3. Let the Nx Nest generator establish the framework major, then verify all `@nestjs/*`, adapter, Swagger, validation, and testing packages against that major. If intentionally targeting a newer Nest major, prove Nx compatibility in the disposable workspace before changing the real guide.
4. Resolve and pin the rest of the stack, run the package manager's peer check and build-script review, then record the verified matrix and date here.
5. Re-run generation, strict typechecking, OpenAPI/client drift, both real database E2E suites, and the image smoke test from an empty package store/cache. A warm checkout is not evidence that all build tools and runtime dependencies are declared.
6. Review official migration guides for every crossed major. Record either the adopted change or an explicit deferred decision with an owner/test plan.

### Nest 12 decision gate (added after the reference implementation)

The reference implementation was generated on Nest 11 because Nx 23.1.1 selected that major. Nest 12 was released during the work. Its core packages ship as ESM, while modern Node can still consume them from a CommonJS application; converting application code to ESM is optional. Nest 12 also adds built-in Standard Schema validation/serialization, changes lifecycle-hook ordering, reworks HTTP-adapter error mapping, raises CLI/schematics Node requirements, and deprecates webpack-centric Nest CLI workflows in favor of Rspack.

Decision as of 3 September 2026: keep the verified reference implementation on Nest 11. This is not because its own code must remain CommonJS. It is because `@nx/nest@23.1.1` declares Nest peers below 12 and the published Nx support table covers Nest 10/11, while `nestjs-zod@5.5.0` also declares only Nest 10/11 and Swagger through 11. Forcing the upgrade would place both the workspace integration and the central validation/OpenAPI boundary outside their supported peer matrices. If a later spike targets Nest 12 on Node 24, use Node 24.15 or newer because the Nest 12 CLI/schematics floor is stricter than the application runtime floor.

A disposable 12.0.0 spike confirmed the decision: Node's CJS loader, the webpack build, and the `ts-node` OpenAPI utility worked, but the dependency graph had unsupported peers and the current Jest API suites could not parse Nest's ESM entrypoint. A minimal NodeNext branch failed project-graph construction at the CommonJS webpack config, before the expected import/config migration. The evidence and future acceptance matrix are recorded in [`docs/research/nest-12-implications.md`](docs/research/nest-12-implications.md).

Do not upgrade this starter by changing version numbers alone. First run a focused compatibility spike covering:

- Nx 23's Nest generators/executors and whether a newer Nx line is required;
- the current CommonJS webpack API bundle, the externalized esbuild migration bundle, and pruned production manifest;
- `ts-node` OpenAPI/migration entrypoints and path aliases;
- Jest unit tests, Fastify injection, Testcontainers teardown, and shutdown-hook order;
- the Problem Details filter after Nest's HTTP adapter error-mapping changes;
- whether native `StandardSchemaValidationPipe` and `StandardSchemaSerializerInterceptor` can replace `nestjs-zod` while preserving OpenAPI 3.1 and shared Zod schemas;
- an ESM-native alternative using `type: module`, `module`/`moduleResolution: nodenext`, `.js` relative specifiers, and ESM-compatible Jest/build configuration.

Compare a minimal CommonJS-compatible Nest 12 branch with an ESM-native branch. Prefer the simpler branch only after the complete acceptance suite and image smoke test pass. See [`docs/research/nest-12-implications.md`](docs/research/nest-12-implications.md), the [Nest 12 release](https://github.com/nestjs/nest/releases/tag/v12.0.0), and the [official migration guide](https://docs.nestjs.com/migration-guide).

## 4. Target repository

```text
nx-react-nest-starter/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   └── generate-openapi.ts
│   │   ├── drizzle.config.ts
│   │   ├── openapi/openapi.json
│   │   ├── .env.example
│   │   └── project.json
│   ├── api-e2e/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── generated/api.d.ts
│   │   │   ├── lib/
│   │   │   └── main.tsx
│   │   ├── .env.example
│   │   └── project.json
│   └── web-e2e/
├── libs/
│   ├── api/
│   │   ├── application/
│   │   └── database/
│   │       ├── src/
│   │       └── drizzle/
│   └── shared/
│       └── contracts/
├── tools/
│   └── scripts/
├── .github/workflows/ci.yml
├── compose.yaml
├── Dockerfile.api
├── nx.json
├── package.json
├── pnpm-lock.yaml
├── README.md
└── docs/architecture.md
```

Keep internal libraries non-publishable and non-buildable. Nx bundles them into their consuming applications.

## 5. Bootstrap sequence

Start with an empty integrated Nx workspace using the `apps` preset and pnpm. Before running a copied command, inspect the installed CLI help: Nx occasionally changes generator option names while preserving the underlying workspace model.

```bash
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm dlx create-nx-workspace@23.1.1 nx-react-nest-starter \
  --preset=apps \
  --workspaceType=integrated \
  --packageManager=pnpm \
  --nxCloud=skip \
  --interactive=false
cd nx-react-nest-starter
```

Confirm that the root records `pnpm@11.24.0`, commit the lockfile, and keep all Nx plugins on Nx 23.1.1.

The empty `apps` preset does not install Prettier, but the project generators load it even during a dry run. Install it before previewing generators:

```bash
pnpm add -Dw prettier
```

Add the official plugins at matching versions:

```bash
pnpm nx add @nx/react@23.1.1
pnpm nx add @nx/nest@23.1.1
pnpm nx add @nx/js@23.1.1
pnpm nx add @nx/vitest@23.1.1
pnpm nx add @nx/jest@23.1.1
pnpm nx add @nx/playwright@23.1.1
pnpm nx add @nx/docker@23.1.1
pnpm nx add @nx/webpack@23.1.1
```

`@nx/webpack` is required because the Nest application generator uses Webpack by default. If pnpm asks to approve a transitive build script while adding plugins, review the package and commit the decision in `pnpm-workspace.yaml`; do not leave a generated `set this to true or false` placeholder.

Dry-run the current generators before applying them:

```bash
pnpm nx g @nx/react:app apps/web \
  --bundler=vite --routing=false --style=css --strict \
  --unitTestRunner=vitest --e2eTestRunner=playwright \
  --linter=eslint --useProjectJson --interactive=false \
  --tags=scope:web,type:app,platform:browser \
  --dry-run

pnpm nx g @nx/nest:app apps/api \
  --strict --unitTestRunner=jest --e2eTestRunner=jest \
  --linter=eslint --useProjectJson --interactive=false \
  --tags=scope:api,type:app,platform:node \
  --dry-run

pnpm nx g @nx/js:lib libs/shared/contracts \
  --bundler=none --strict --unitTestRunner=vitest \
  --linter=eslint --useProjectJson --interactive=false \
  --tags=scope:shared,type:contract,platform:agnostic \
  --dry-run

pnpm nx g @nx/nest:lib libs/api/application \
  --strict --unitTestRunner=jest \
  --linter=eslint --useProjectJson --interactive=false \
  --tags=scope:api,type:application,platform:node \
  --dry-run

pnpm nx g @nx/js:lib libs/api/database \
  --bundler=none --strict --unitTestRunner=jest \
  --linter=eslint --useProjectJson --interactive=false \
  --tags=scope:api,type:data-access,platform:node \
  --dry-run
```

Remove `--dry-run` only after the preview matches the target paths. Modern Nx may derive package-scoped project identities from package-manager workspaces; inspect `pnpm nx show projects` and use the actual generated identities in targets, Docker setup, and CI. The logical names in this guide remain `web`, `api`, `web-e2e`, `api-e2e`, `shared-contracts`, `api-application`, and `api-database`.

Generate:

- React application `web` using Vite, CSS, Vitest, and no generated routing;
- Nest application `api` using Jest;
- Playwright project `web-e2e`;
- Jest project `api-e2e`;
- TypeScript libraries `shared-contracts`, `api-application`, and `api-database` at the paths shown above.

Prefer the official generators over hand-created project configuration. Use `pnpm nx list <plugin>` and `pnpm nx g <generator> --help` to confirm current flags, then normalize names, directories, tags, and test runners to this specification. Do not accept generator-created sample components or endpoints as product code; reduce them to the proof described here.

Install the application stack from current stable, mutually compatible release lines and lock the resolved versions. In particular, match the major of Nest packages added by the Nx generator; do not let an unqualified install mix a newer `@nestjs/platform-fastify` or `@nestjs/swagger` major with the generated `@nestjs/core` major:

```bash
pnpm add -w @tanstack/react-query @tanstack/react-router openapi-fetch
pnpm add -w @nestjs/platform-fastify @nestjs/swagger @fastify/static zod nestjs-zod
pnpm add -w drizzle-orm postgres tslib
pnpm add -Dw @tanstack/router-plugin tailwindcss @tailwindcss/vite esbuild
pnpm add -Dw openapi-typescript drizzle-kit @testcontainers/postgresql
```

Use `--save-exact` (or pnpm's `-E`) for the application stack so `package.json`, not only the current lockfile, records the reviewed versions. After switching Nest to Fastify and replacing the generated HTTP E2E scaffold with Fastify injection, remove the unused `@nestjs/platform-express` and `axios` dependencies.

Run `pnpm peers check` after installation. At the time of this implementation, the generator selected TypeScript 6 while `openapi-typescript` 7 still declared TypeScript 5 support; pinning TypeScript 5.9.x avoids carrying an unsupported peer combination. Optional peers that the running process actually loads still need an explicit production pin; `pnpm peers check` does not fail when they are absent.

Run Nest-decorated generation entrypoints with `ts-node` using `apps/api/tsconfig.app.json` (and `tsconfig-paths/register` for workspace aliases). `tsx` uses an esbuild decorator transform that is incompatible with the legacy decorator metadata expected by Nest/Swagger 11 in this setup.

Repeat the API workspace aliases in `apps/api/tsconfig.app.json`. The source-run `ts-node`/`tsconfig-paths` utilities load that project directly, and relying on the base config's alias map through the app's extends chain does not resolve those imports in this setup.

Use stable Drizzle (`drizzle-orm` 0.45.x and `drizzle-kit` 0.31.x at verification), not its separate v1 release-candidate documentation line. Initialize shadcn only after the web import alias and Tailwind Vite plugin work. The following older command is valid only for CLI versions that still recognize an Nx integrated app as an existing Vite project:

```bash
pnpm dlx shadcn@latest init -c apps/web
```

shadcn CLI v4 treats an integrated Nx app without an app-local `package.json` as a location for a new project, so that command creates an unwanted nested Vite app. With CLI v4, follow the official existing-project setup: add a minimal app-local `package.json` whose name matches the Nx project, add `apps/web/components.json`, point it at `src/styles.css` and the `@/*` alias, install the preset's base dependencies, and then run `pnpm dlx shadcn@latest add <component> -c apps/web`. Continue using the CLI to add app-owned component source; do not run `init` against `apps/web`.

TypeScript does not merge `compilerOptions.paths` through `extends`. When adding the app-local `@/*` alias, repeat the web app's required workspace alias (`@nx-react-nest-starter/shared-contracts`) in `apps/web/tsconfig.json`; otherwise type checking may work through project references while the Vite production linker still cannot resolve the runtime import.

Commit the exact shadcn CLI result and lockfile; do not place an unpinned `shadcn@latest` command in repository automation.

After generation, initialize Git if the workspace generator did not do so and create the initial baseline commit only after all quality commands pass.

Ensure the generated workspace has a solution-style root `tsconfig.json` extending `tsconfig.base.json`, with empty `files` and a `references` array. The Nx 23 TypeScript sync plugin fails all graph-aware typecheck commands if this file is absent; run `pnpm nx sync` once after adding it.

Normalize generated module settings before the first typecheck. With a root `moduleResolution: "bundler"`, Nx 23.1.1 generates non-buildable libraries with `module: "commonjs"`, an invalid TypeScript combination (`TS5095`). Keep the browser-safe contracts library on `module: "esnext"`; set the Nest/Node libraries and app to `moduleResolution: "node"` when they retain CommonJS output.

When using TypeScript 5.9 with Nx's inferred library `typecheck` target, add `composite: true` and `declaration: true` to generated library `tsconfig.spec.json` files. Nx invokes `tsc --build ... --emitDeclarationOnly`; without those options TypeScript reports `TS5069` before checking tests.

### What went wrong in the reference build

This is the implementation record from 2–3 September 2026. Keep it because it distinguishes structural complexity from version/tooling friction and prevents a warm local checkout from hiding missing setup.

| Stage                                              | Symptom                                                                                            | Cause                                                                                                                                                | Correction/workaround now encoded in this guide                                                                                                                                      |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| First generator dry-run                            | Generator failed before showing its plan                                                           | The empty Nx `apps` preset did not install Prettier, but generators loaded it during dry-run                                                         | Install Prettier before any project generator.                                                                                                                                       |
| Nest app generation                                | Missing executor/plugin errors                                                                     | The generated Nest build used Webpack, but the official plugin set initially omitted `@nx/webpack`                                                   | Install the exact matching `@nx/webpack` version before generating the API.                                                                                                          |
| Generator commands                                 | Flags/defaults differed from assumptions and project names could become package-scoped             | Nx generator surfaces and package-workspace naming evolve                                                                                            | Read current `--help`, use explicit lint/project-json/interactive flags, inspect dry-runs, then normalize actual project names and target references.                                |
| pnpm install                                       | pnpm requested decisions for transitive build scripts and generated incomplete policy placeholders | pnpm 11 requires reviewed build-script policy                                                                                                        | Review each package, commit explicit booleans in `pnpm-workspace.yaml`, and carry that policy into clean/container installs.                                                         |
| Stack installation                                 | An unqualified install could mix the generator's Nest 11 core with a newer adapter/Swagger major   | Framework companions do not safely float across majors                                                                                               | Let the generator choose the framework line, install companions on the same compatible major, pin exact versions, and remove unused Express/Axios dependencies.                      |
| Peer validation                                    | `openapi-typescript` rejected the generator-selected TypeScript 6 peer range                       | The chosen client generator still supported TypeScript 5                                                                                             | Pin TypeScript 5.9 for this verified matrix and re-evaluate rather than suppressing the peer warning.                                                                                |
| First graph-aware typecheck                        | Nx's TypeScript sync failed before checking code                                                   | The generated integrated workspace lacked a solution-style root `tsconfig.json`                                                                      | Add the root solution config and run `nx sync`.                                                                                                                                      |
| Library typecheck                                  | `TS5095` (`bundler` resolution with CommonJS)                                                      | Generated library module settings conflicted with the strict root resolution setting                                                                 | Keep browser/contract output ESNext; give CommonJS Node projects `moduleResolution: node`.                                                                                           |
| Spec-project typecheck                             | `TS5069` around declaration-only build output                                                      | Nx inferred `tsc --build --emitDeclarationOnly` but generated spec configs lacked composite/declaration settings                                     | Add `composite` and `declaration` to the affected library spec configs and maintain project references without duplicate keys.                                                       |
| Nest-decorated utility execution                   | Swagger/decorator metadata broke under `tsx`                                                       | esbuild's decorator transform did not match the legacy metadata expected by Nest/Swagger 11                                                          | Run decorated OpenAPI/migration utilities with `ts-node` plus the correct project config and alias registration. Use esbuild only for the compiled migration artifact.               |
| shadcn initialization                              | CLI v4 created nested Vite/Next applications under `apps/web`                                      | It did not recognize the integrated Nx application without an app-local package manifest                                                             | Preserve/remove the accidental output, add the minimal app-local `package.json` and `components.json`, install preset dependencies, and use `shadcn add -c apps/web` without `init`. |
| Web production linking                             | Shared-contract imports could typecheck yet fail in Vite                                           | TypeScript `paths` are replaced, not merged, by the app-local config                                                                                 | Repeat both `@/*` and required workspace aliases in the web config.                                                                                                                  |
| Generated route tree                               | `format:write` was immediately followed by a `format:check` failure                                | TanStack regenerated `routeTree.gen.ts` using its own formatting during Nx graph/build work                                                          | Exclude the generated file from Prettier/ESLint and use a separate generation drift check.                                                                                           |
| API E2E on local Podman                            | Testcontainers waited indefinitely/faulted on Ryuk's startup log                                   | The Podman-backed compatible endpoint did not behave like ordinary Docker for Ryuk                                                                   | Locally use `TESTCONTAINERS_RYUK_DISABLED=true`; retain explicit suite cleanup and keep Ryuk enabled on Docker CI.                                                                   |
| Migration artifact target                          | The direct Nx Webpack executor failed without useful detail in the custom second-entrypoint target | The executor assumptions did not match the generated run-command/Webpack application configuration                                                   | Bundle `migrate.ts` with a small explicit esbuild target, externalizing npm packages while bundling workspace aliases.                                                               |
| Clean Docker build                                 | `esbuild: not found` although the target worked on the host                                        | The binary existed only as a transitive dependency in the warm checkout                                                                              | Add exact `esbuild` as a direct dev dependency. Every target executable must be declared directly.                                                                                   |
| Runtime image install                              | `ERR_PNPM_IGNORED_BUILDS` for an already reviewed transitive package                               | The runtime stage copied the pruned manifest/lockfile but not pnpm's workspace build policy                                                          | Copy `pnpm-workspace.yaml` into the runtime install stage.                                                                                                                           |
| Runtime image startup                              | `Cannot find module 'tslib'`                                                                       | TypeScript emitted a runtime helper, but `tslib` was in dev dependencies and Nx's pruned manifest omitted it until it was an explicit runtime import | Move `tslib` to exact production dependencies, explicitly import it at the API entrypoint, rebuild without cache, and inspect the pruned manifest.                                   |
| Image smoke under a docker-container Buildx driver | A successful build could remain only in BuildKit cache                                             | That driver requires an explicit load for subsequent `docker run`                                                                                    | The repository smoke script uses `docker build --load`; publishing workflows should use the appropriate `--push`/output instead.                                                     |
| Local quality commands in the managed workspace    | pnpm/Nx reported `unable to open database file`                                                    | Nx's user-level cache database was outside the restricted workspace sandbox                                                                          | Grant the command access to the user cache or set an allowed cache location. This is an execution-environment workaround, not a repository requirement.                              |
| Framework baseline changed mid-build               | Nest 12 became current after Nest 11 had been generated and integrated                             | Framework release timing invalidated “current stable” as a timeless instruction                                                                      | Freeze the verified Nest 11 result, add the explicit Nest 12 decision gate above, and require a compatibility spike rather than silently changing majors.                            |
| Guide source reference                             | The original guide named a companion research note that was not present in the repository          | A planning-time artifact path was treated as if it were committed                                                                                    | Keep evidence notes under `docs/research/`, verify links in a clean checkout, and link only committed artifacts.                                                                     |
| Local `pnpm run dev`                               | API exited; Vite proxied `/api/health/ready` to `ECONNREFUSED :3000`                               | Nest Swagger on Fastify `useStaticAssets()` `loadPackage()`s optional `@fastify/static` and `process.exit(1)`s when it is missing; development defaults docs on; generation and E2E kept docs off | Pin `@fastify/static` as an exact production dependency on the platform-fastify peer major, list it in webpack `runtimeDependencies`, and factory-test the docs-enabled boot path. |

### Edits made after generation

The official generators supplied a useful skeleton, but they did not produce the finished architecture. The reference build then:

- pinned the package manager, Nx plugins, compatible application stack, TypeScript, PostgreSQL/pgvector image, and pnpm build-script policy;
- normalized project names, tags, implicit dependencies, dependency-boundary rules, strict compiler options, project references, and test runners;
- replaced sample React and Nest code with shared strict Zod contracts, a thin Fastify API composition root, validated environment loading, safe Problem Details, liveness/readiness, OpenAPI generation, and a runtime-validating same-origin web client;
- added the database adapter, checked-in forward migration, migration CLI, local and isolated E2E Compose files, and explicit database reset semantics;
- configured TanStack Router/Query, Tailwind, app-owned shadcn components, pre-paint system/light/dark theming, and deterministic component tests;
- replaced generated HTTP tests with Fastify injection plus Testcontainers and replaced the placeholder Playwright spec with a real-stack Chromium flow;
- added committed OpenAPI/client output and drift checks, generated-route drift checking, the multi-stage non-root API image, its migration/liveness smoke test, and clean shutdown/database disposal;
- added provider-neutral root commands, CI jobs, environment examples, README, and architecture documentation.

Inspect the reference repository's diff for the exact file-level implementation; this section explains why the non-generator edits exist rather than duplicating every file.

### What I would change if starting again

Yes—the guide should change, but the core three-library/two-app structure should not be discarded based on these failures. Most failures came from version skew, generator assumptions, clean-build dependency classification, and tool interoperability; the project seams made those failures easier to isolate.

On a second implementation I would:

1. Start with a disposable compatibility spike and run the clean Docker image by the end of the first tooling phase, before writing UI/API features. This would expose missing `esbuild`, pnpm policy, and `tslib` immediately.
2. Decide Nest 12 CommonJS-compatible versus ESM-native before selecting Nx/Nest/test/bundler versions. Do not build new custom Webpack work on a line Nest now deprecates without comparing Nx-supported Rspack or an ESM-native Node build.
3. Create a project-variables checklist first, then derive package scope, database identifiers, Compose names, image names, ports, and display copy from it. Run the residue search before and after generation.
4. Install Prettier and the complete exact Nx plugin set before the first dry-run, then commit a generator-only baseline. Keep later changes in small verified slices so generator corrections are distinguishable from product architecture.
5. Pin a compatibility matrix before installing application packages and run peer/build-policy checks immediately. Never use “latest” independently for coupled Nest packages.
6. Add root solution TypeScript configuration and normalize module/reference settings before generating libraries' implementation code.
7. Configure the app-local web manifest, aliases, Tailwind, and shadcn files manually for integrated Nx, using the shadcn CLI only to add owned components.
8. Build OpenAPI generation, migrations, and image entrypoints as first-class Nx targets with direct tool dependencies from the start. Test them once with caches disabled and once inside the production image. Prove the docs-enabled factory path; generation and E2E that disable docs do not.
9. Introduce real API E2E before browser E2E, then reuse a single documented orchestration pattern with unique ports, named resources, and traps.
10. Keep `api-application`, `api-database`, and browser-safe contracts as the initial deep seams. Do not add more projects until a real feature demonstrates independent ownership or dependency pressure.

## 6. Project responsibilities and dependency rules

### `apps/web`

Owns browser composition, route setup, the query client, the theme provider, the shell UI, and static assets. It may import `shared-contracts`. It must not import API or Node projects.

### `apps/api`

Is a thin executable. `main.ts` loads validated environment configuration, calls the API application factory, listens, and handles shutdown. The OpenAPI generation entrypoint builds the same application without listening.

### `libs/api/application`

Owns the Nest root module, Fastify/Nest application factory, global prefix, validation and serialization, Problem Details exception mapping, docs wiring, and feature-organized modules. Its initial features are only configuration and health.

### `libs/api/database`

Owns the Drizzle schema, connection factory, migration runner and checked-in migration history, readiness adapter, and connection cleanup. It exposes a narrow public API and no Nest controllers.

### `libs/shared/contracts`

Owns browser-safe Zod 4 schemas and inferred transport types, organized by feature. Initially it contains health and Problem Details contracts. It may import only Zod; it must not import Nest, React, Drizzle, Node-only modules, or generated client code.

### E2E projects

- `api-e2e` imports the public API application factory and database migration/test helpers, never source files from `apps/api`.
- `web-e2e` drives both deployables over HTTP. Give it implicit Nx dependencies on `web` and `api`.
- Give `api-e2e` an implicit dependency on `api` so affected calculations reflect the runtime relationship.

### Tags

Tag projects on three axes:

| Project            | Scope          | Type               | Platform            |
| ------------------ | -------------- | ------------------ | ------------------- |
| `web`              | `scope:web`    | `type:app`         | `platform:browser`  |
| `api`              | `scope:api`    | `type:app`         | `platform:node`     |
| `web-e2e`          | `scope:web`    | `type:e2e`         | `platform:node`     |
| `api-e2e`          | `scope:api`    | `type:e2e`         | `platform:node`     |
| `shared-contracts` | `scope:shared` | `type:contract`    | `platform:agnostic` |
| `api-application`  | `scope:api`    | `type:application` | `platform:node`     |
| `api-database`     | `scope:api`    | `type:data-access` | `platform:node`     |

Configure `@nx/enforce-module-boundaries` so:

- browser code can depend only on browser or agnostic code;
- agnostic code can depend only on agnostic code;
- web scope can depend on web or shared scope;
- API scope can depend on API or shared scope;
- contracts can depend only on contracts;
- applications compose features, data access, contracts, and utilities;
- feature libraries cannot import laterally from other feature libraries;
- imports cross a project boundary only through its public entrypoint;
- circular dependencies and exceptions are forbidden.

The initial dependency graph should be:

```text
web ───────────────▶ shared-contracts
api ───────────────▶ api-application
api-application ───▶ api-database
api-application ───▶ shared-contracts
api-e2e ───────────▶ api-application
api-e2e ───────────▶ api-database
```

## 7. TypeScript and code quality

Put strictness in the root base configuration and do not weaken it in projects:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Use ESLint for correctness and dependency boundaries, and Prettier for formatting. Provide root commands that humans and CI share:

```json
{
  "scripts": {
    "format": "nx format:write",
    "format:check": "nx format:check",
    "lint": "nx run-many -t lint",
    "typecheck": "nx run-many -t typecheck",
    "test": "nx run-many -t test",
    "build": "nx run-many -t build",
    "graph": "nx graph"
  }
}
```

Use Nx targets, not shell globbing, as the stable automation interface. Targets that mutate a database or generated source must be marked non-cacheable.

## 8. Shared HTTP contracts

Use one hand-authored set of Zod 4 payload schemas. Keep transport values JSON-native: dates are ISO strings, not `z.date()`, and optional fields must not be emitted as explicit `undefined`.

Initial schemas:

- `HealthResponse`: `{ status: "ok" }`.
- `ProblemDetails`: RFC 9457 fields `type`, `title`, `status`, and optional `detail` and `instance`.
- `ValidationProblemDetails`: `ProblemDetails` plus `errors`, an array of stable field issues containing a path, code, and safe message.

Generic HTTP failures use `type: "about:blank"` and the standard status title. Never serialize stack traces, SQL, connection details, raw exception messages, or validation-library internals.

In API feature code, adapt shared schemas through thin `nestjs-zod` DTO classes. Install globally:

- `ZodValidationPipe` for body, path, and query parsing;
- `ZodSerializerInterceptor` for response validation;
- one exception filter that converts expected HTTP/Zod errors and unexpected errors into the shared Problem Details envelope.

Annotate controllers so response schemas, runtime serialization, TypeScript return types, and Swagger metadata stay synchronized. A response that violates its declared schema is an internal server error, never silently passed through.

## 9. OpenAPI and the web client

Generate OpenAPI 3.1 from the Nest application. Clean the generated document using the `nestjs-zod` OpenAPI cleanup function and use a stable `operationIdFactory` so generated client names do not churn.

The generation pipeline is:

```text
shared Zod schemas
        │
        ▼
API-local Zod DTO adapters + Nest route metadata
        │
        ▼
apps/api/openapi/openapi.json
        │
        ▼
openapi-typescript
        │
        ▼
apps/web/src/generated/api.d.ts
        │
        ▼
openapi-fetch + feature-specific web client wrappers
```

Commit both generated artifacts. Add non-cacheable generation targets and a `contracts:check` command that regenerates them and fails when Git detects a diff. Never generate a second set of Zod schemas from OpenAPI.

Add a contract smoke test before treating generated files as stable. It must assert OpenAPI version `3.1.0`, the two health paths, stable operation IDs, success schemas, `application/problem+json` error content, and the component references consumed by the generated client.

The browser client uses OpenAPI-generated path types for request correctness and shared Zod schemas for runtime response parsing. Every feature-specific client wrapper must parse successful and error responses before returning data to TanStack Query.

Because OpenAPI paths include `/api`, let `openapi-fetch` use same-origin paths directly; do not introduce a `VITE_API_URL` in the initial starter.

Serve Swagger UI at `/api/docs` and JSON at `/api/openapi.json` only when validated `API_DOCS_ENABLED` is true. Default it to true outside production and false in production; production may explicitly opt in. Fastify Swagger UI calls `useStaticAssets()`, so pin `@fastify/static` as a production dependency on the same major as `@nestjs/platform-fastify`'s peer (`10.1.x` in this matrix). Nest `loadPackage()` exits the process when it is missing. OpenAPI generation and HTTP E2E may keep docs off; the application-factory suite must boot with docs enabled and assert `/api/docs/` and `/api/openapi.json`. The committed OpenAPI document remains the review and client-generation artifact regardless of runtime docs exposure.

## 10. API application

Use Nest with the Fastify adapter and set the global prefix to `/api`. Do not add a version segment.

The application factory must:

1. create the Nest/Fastify application without listening;
2. install global validation, response serialization, and Problem Details handling;
3. apply `/api`;
4. conditionally configure OpenAPI;
5. enable shutdown hooks;
6. return the application to the caller.

`main.ts` owns only process concerns: validated environment loading, factory invocation, host/port binding, signal handling, and top-level fatal-startup reporting. Nest shutdown must close Fastify and the PostgreSQL pool. Do not hide startup failures or leave connections open.

CORS is disabled. Production must supply same-origin `/api` routing at the edge; local Vite configuration proxies `/api` to the API development server.

## 11. Health contract

### `GET /api/health/live`

- Checks only whether the API process can serve requests.
- Does not query PostgreSQL or any external dependency.
- Returns `200` and `{ "status": "ok" }`.

### `GET /api/health/ready`

- Executes a cheap PostgreSQL probe such as `select 1` through the database adapter.
- Returns `200` and `{ "status": "ok" }` when the probe succeeds.
- Returns `503` and safe RFC 9457 Problem Details when the probe fails.
- Does not expose driver, host, credential, timeout, or SQL details.

The API image `HEALTHCHECK` calls liveness, not readiness. A database outage should remove instances from traffic through platform readiness configuration, not induce container restart loops. Document both endpoints for deployment operators.

## 12. Database and migrations

Use Drizzle’s code-first, checked-in migration workflow:

```text
edit TypeScript schema
  → explicitly generate migration
  → review SQL and metadata
  → commit
  → explicitly apply checked-in migrations
```

Never use schema push as the supported workflow. Never generate migrations in CI or deployment. API startup is schema-side-effect-free.

Place Drizzle configuration with the API deployable and schema/migration implementation in `api-database`. Expose non-cacheable Nx targets equivalent to:

- `api:migration-generate` — developer-only generation;
- `api:migration-check` — validate committed migration/contract state without mutating source;
- `api:migrate` — apply pending checked-in migrations;
- `db:up` / `db:down` — local pgvector service lifecycle;
- `db:reset` — explicitly destructive, local-only reset of the named project database volume followed by migration.

Create migration `0000_enable_vector` as a custom SQL migration containing:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

The PostgreSQL server or managed provider must already make pgvector available. Document that extension creation can require elevated privileges.

### Local development

Compose starts only `pgvector/pgvector:0.8.6-pg18-bookworm`. Apps run on the host. Mount its named data volume at the PostgreSQL 18 image's documented data root rather than carrying forward a pre-18 volume path. Add a database healthcheck, a fixed local-only port mapping, and repository-specific Compose resource names. Starting the API never migrates; the normal sequence is `db:up`, `api:migrate`, then the development servers. A convenience `dev:setup` may compose those explicit operations.

### API E2E

Start one fresh Testcontainers PostgreSQL/pgvector container per test-suite invocation, use its random connection URI, run the same committed migrator before creating the Nest application, then terminate the app, pool, and container. Do not reuse a local database or container in CI. Isolate fixtures inside the suite when later tests need data.

On a Podman-backed Docker-compatible endpoint, Testcontainers' Ryuk sidecar may fail while waiting for its `Started` log line. The suite still owns explicit cleanup; for that local runtime use `TESTCONTAINERS_RYUK_DISABLED=true pnpm e2e:api`. Keep Ryuk enabled on ordinary Docker/CI runners so abrupt-process cleanup remains available.

### Production

Package migration SQL and a small Drizzle ORM migration entrypoint in the API image; do not require the Drizzle Kit development CLI at runtime. A serialized one-shot release job applies migrations before the API rollout:

```text
migration fails ──▶ abort rollout; old API remains running
migration succeeds ──▶ roll out new API
```

Support `MIGRATION_DATABASE_URL`. Production migration jobs require it; local development and tests may fall back to `DATABASE_URL`. The long-running API uses only `DATABASE_URL` and should receive runtime privileges rather than schema-owner privileges.

Migrations are forward-only. Use expand/contract changes so a migration remains compatible with the old API during rollout and application rollback never depends on a down migration.

## 13. Environment configuration

Validate environment input at each application boundary with Zod and fail before listening or rendering when configuration is invalid.

`apps/api/.env.example` documents at least:

```dotenv
NODE_ENV=development
API_HOST=127.0.0.1
API_PORT=3000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/nx_react_nest
MIGRATION_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/nx_react_nest
API_DOCS_ENABLED=true
```

The API container overrides `API_HOST=0.0.0.0`. Parse booleans and numbers explicitly; JavaScript truthiness is not environment validation.

The web has no API-origin variable because it always uses same-origin `/api`. Keep a web environment schema for any future public build-time values and commit `apps/web/.env.example`, initially documenting that no custom variables are required. Never expose database or server secrets through `VITE_*` variables.

Do not commit real `.env` files.

## 14. Web shell

Use TanStack Router's file-based Vite plugin for a single root route and TanStack Query for readiness. Place the Router plugin before the React plugin and enable automatic code splitting. Commit its generated `routeTree.gen.ts`, exclude that file from linting/formatting, and add a drift check so route generation cannot silently become a prerequisite for type checking. Do not add routes merely to demonstrate routing.

The shell contains:

- a concise starter heading and explanation;
- one API readiness card;
- a system/light/dark theme control;
- no dashboard navigation, charts, fake metrics, or placeholder product areas.

Readiness behavior:

- fetch on initial render;
- retry once automatically;
- refetch when the window regains focus;
- do not poll;
- expose a manual retry action when unavailable;
- render accessible loading, ready, and unavailable states without layout shift.

Use only the shadcn components required by the shell, likely `Card`, `Button`, and an accessible menu or segmented control for theme selection. Add components through the shadcn CLI so their source remains app-owned and editable.

Theme behavior:

- default to the operating-system preference;
- allow explicit system, light, or dark selection;
- persist selection in local storage;
- react to OS changes only while system mode is selected;
- apply the theme before first paint to avoid a visible flash;
- use Tailwind/shadcn CSS variables rather than component-specific colors.

## 15. Tests

### Web unit/component tests — Vitest

Use Testing Library and test observable behavior:

- readiness loading state;
- valid ready response;
- unavailable/Problem Details response;
- malformed success response rejected by Zod;
- automatic and manual retry behavior with controlled timers/network adapters;
- system theme selection and explicit persisted overrides.

These tests may mock the web client boundary. Do not mock TanStack Query itself.

### API unit tests — Jest

Unit-test policy and mapping without listening or a real database:

- liveness service/controller behavior;
- readiness success/failure mapping through a mocked database readiness port;
- Problem Details conversion and redaction;
- environment parsing;
- application-level schema serialization failures;
- application factory with docs enabled serves Swagger UI and `/api/openapi.json`.

### API E2E — Jest, Fastify `inject()`, Testcontainers

Create the real application through its public factory and use Fastify injection. Cover:

- liveness without a database query;
- readiness against migrated pgvector PostgreSQL;
- readiness returns `503` Problem Details when the database becomes unavailable;
- validation and not-found responses use the shared Problem Details contract;
- generated OpenAPI contains the health operations and declared error responses;
- migration `0000` enabled the `vector` extension.

The initial proof API has no request body, path parameter, or query contract. Do not add a meaningless health parameter only to exercise the global validation pipe. Until the first input-bearing feature is added, cover validation-to-Problem-Details mapping in the exception-filter unit suite; the first real input route must add the corresponding Fastify E2E case.

### Browser E2E — Playwright

Run Chromium against real web, API, and a dedicated migrated PostgreSQL/pgvector database. Do not intercept the readiness request. Use an E2E-only Compose service/database and a repository-owned orchestration script that removes only that E2E volume, starts PostgreSQL, applies committed migrations, runs Playwright, and tears down on success, failure, or interruption. Playwright's `webServer` entries start the real API and Vite web server. The blocking flow is:

1. open `/`;
2. observe the shell;
3. wait for the real ready state;
4. select dark or light explicitly;
5. reload;
6. verify the selection and ready state persist/return.

Loading and unavailable visual states remain deterministic component-test responsibilities. Configure Playwright so Firefox/WebKit projects can be added later, but only Chromium blocks the initial CI.

Every E2E orchestration script must clean up its own processes and containers on success, failure, or interruption.

## 16. API image

Create one multi-stage `Dockerfile.api` with these properties:

- installs from the frozen pnpm lockfile;
- builds only the API and required migration artifact;
- contains production dependencies and compiled output only;
- runs as a non-root user;
- binds on `0.0.0.0`;
- receives configuration at runtime, never via baked secrets;
- uses an exec-form command so termination signals reach Node;
- includes a liveness `HEALTHCHECK` implemented without assuming `curl` is present;
- exposes the API port as documentation, without relying on `EXPOSE` for security;
- supports a one-shot migration command using the same immutable image.

Declare every build executable used by a repository target as a direct, pinned dev dependency. In particular, if the migration entrypoint is bundled with `esbuild`, add `esbuild` explicitly; a binary that is accidentally available through another package can work in an existing checkout and disappear during the Docker build's clean frozen-lockfile install. The migration bundle may keep npm packages external while bundling workspace aliases, then share the API image's pruned production dependencies.

pnpm 11 stores dependency build-script decisions in `pnpm-workspace.yaml`, not in the lockfile. Copy the reviewed workspace policy alongside the pruned `package.json` and lockfile before the runtime-stage `pnpm install --prod --frozen-lockfile`; omitting it makes a clean image install fail on an already reviewed transitive build script.

Keep emitted runtime helpers such as `tslib` in `dependencies`, not `devDependencies`. Nx's pruned production manifest follows the declared dependency class, so a helper available during compilation can otherwise be absent when the compiled server starts in the runtime image.

Nx `generatePackageJson` traces the compilation graph and misses packages Nest loads through `loadPackage()`. List those runtime peers in the API webpack plugin's `runtimeDependencies` so the pruned image manifest still contains them when production opts into docs. This matrix lists `@fastify/static`.

Enable Nest shutdown hooks and close the database pool during termination. Validate both normal API startup and the migration entrypoint in container smoke tests.

The web output is a static Vite build. Do not couple it to the API image. Document that the static host must fall back to `index.html` for client routes and that the edge must route `/api` before the SPA fallback.

The repository supplies immutable artifacts and a one-shot migration command. Secret injection, migration-job serialization, readiness wiring, rollout ordering, and static-host configuration must be shown as platform requirements, not falsely implemented as provider-neutral deployment code.

## 17. Provider-neutral commands

The root package scripts are the public developer/CI interface. Supply at least:

```text
dev                 run web and API on the host
dev:setup           start local DB and apply migrations
db:up               start local pgvector PostgreSQL
db:down             stop local DB without deleting data
db:reset            delete only this repository's local DB volume and remigrate
migration:generate  generate a reviewed Drizzle migration
migration:check     fail when generating from the current schema changes migrations
migrate             apply checked-in migrations
openapi:generate    generate deterministic OpenAPI
client:generate     generate TypeScript path declarations
contracts:generate  run OpenAPI then client generation
contracts:check     regenerate and fail on drift
routes:check        regenerate the TanStack route tree and fail on drift
format / format:check
lint
typecheck
test
e2e:api
e2e:web
build
image:smoke         build the API image, run migrations, start it, and verify liveness
ci                  run the complete blocking suite
```

Map these scripts to Nx targets so Nx understands dependencies and caching. Build, lint, typecheck, and unit tests may cache. Contract generation, migrations, service lifecycle, and real E2E orchestration must not return cached success for work they did not perform.

## 18. GitHub Actions

Use the provider-neutral root commands rather than embedding project logic in YAML. Configure pnpm through the pinned `packageManager`, Node 24, a frozen lockfile install, and Nx’s base/head SHAs for affected execution.

Recommended jobs:

1. **quality** — format check, lint, typecheck, unit tests, contract drift check, and builds;
2. **api-e2e** — Docker-capable runner executing the Testcontainers suite;
3. **web-e2e** — Docker-capable runner installing Playwright Chromium and executing the real-stack flow;
4. **api-image** — build the production image and smoke-test liveness plus the migration entrypoint.

Cache the pnpm store and Nx cache using lockfile-aware keys. Do not cache E2E results or database state. Upload Playwright traces/screenshots only on failure and keep useful test reports as CI artifacts.

For pull requests, use affected targets where practical. The default branch must also have a complete non-affected run available so a mistaken dependency declaration cannot permanently hide work.

## 19. Documentation

`README.md` must include:

- prerequisites and Corepack/pnpm setup;
- install and first-run commands;
- local URLs;
- migration generation/application/reset workflow;
- all quality and test commands;
- OpenAPI/client regeneration workflow;
- production artifact descriptions;
- the same-origin routing requirement;
- a clear warning that `db:reset` deletes local database data;
- explicit non-goals, including the absence of logging/auth/sample-domain policy.

`docs/architecture.md` must include:

- project responsibility map and Nx dependency rules;
- contract source-of-truth and generation flow;
- browser runtime validation boundary;
- API factory/composition seam;
- migration ownership and expand/contract deployment sequence;
- liveness versus readiness semantics;
- local, test, and production topology diagrams;
- guidance for adding a real feature without automatically creating one Nx project per endpoint.

## 20. Ordered implementation plan

Implement in this order so each stage leaves a verifiable repository:

1. Bootstrap workspace, pin tools, enable strict TypeScript, and establish formatting/linting.
2. Generate apps, E2E projects, and the three initial libraries; apply tags and boundary rules.
3. Add shared health and Problem Details Zod contracts with unit tests.
4. Add API configuration, application factory, Fastify adapter, global validation/serialization, and error mapping.
5. Add Drizzle database module, Compose service, migration targets, and pgvector migration.
6. Implement liveness/readiness and API unit/E2E tests.
7. Generate and commit OpenAPI plus client types; add drift checking.
8. Build the typed, runtime-validating web client and TanStack Query hook.
9. Build the router, minimal shell, theme behavior, and component tests.
10. Add real-stack Playwright orchestration and Chromium flow.
11. Add the API production image, migration entrypoint, liveness healthcheck, and smoke tests.
12. Add provider-neutral aggregate scripts and GitHub Actions.
13. Write README and architecture documentation.
14. Run the full acceptance checklist from a clean checkout.

## 21. Definition of done

The starter is complete only when all of the following are true:

- a fresh clone can activate the pinned pnpm version and install with a frozen lockfile;
- `dev:setup` plus `dev` produces a working same-origin local system, including `/api/docs` and `/api/openapi.json` when docs default on;
- `/api/health/live` succeeds without PostgreSQL;
- `/api/health/ready` succeeds with migrated PostgreSQL and returns safe `503` Problem Details without it;
- PostgreSQL reports the `vector` extension enabled;
- web and API share payload schemas without browser code importing Nest concerns;
- every declared API response is validated server-side and web endpoint wrappers parse responses at runtime;
- committed OpenAPI and generated client declarations regenerate without a diff;
- the shell supports loading, ready, unavailable/retry, and persisted system/light/dark behavior;
- Vitest, Jest unit, Jest/Testcontainers API E2E, and Playwright/Chromium real-stack E2E pass;
- strict TypeScript, formatting, linting, and Nx boundary checks pass;
- production web and API builds succeed independently;
- the API image runs as non-root, answers liveness, shuts down cleanly, and can run migrations as a one-shot command;
- the GitHub Actions workflow executes the same repository-owned commands;
- no sample domain, logging stack, authentication, hooks, generated-runtime Zod duplicate, or automatic startup migration has slipped in.

## 22. Final verification

Run from a clean checkout with no pre-existing containers or generated files beyond those committed:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm contracts:check
pnpm routes:check
pnpm test
pnpm e2e:api
pnpm e2e:web
pnpm build
docker build -f Dockerfile.api -t nx-react-nest-starter-api:verify .
```

Then perform two manual deployment-contract checks:

1. serve the static web artifact with SPA fallback and route `/api` to the API container; confirm the browser uses no environment-specific API origin;
2. run the migration command with `MIGRATION_DATABASE_URL`, roll the API, and confirm that stopping PostgreSQL changes readiness to `503` while liveness remains `200`.
