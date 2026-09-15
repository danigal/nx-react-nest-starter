# NestJS 12 implications for this starter

Research date: 2026-09-03. This note evaluates NestJS 12 against the starter as it exists; it does not prescribe an immediate implementation change.

## Recommendation

Do not upgrade the reusable starter to NestJS 12 yet. Keep the API application, build, scripts, and tests on CommonJS while the framework upgrade is evaluated in an isolated branch. The official answer to "does Nx 23 support Nest 12?" is **no for the `@nx/nest` integration** as of this research date. There are two explicit compatibility blockers:

- Nx's 23.x requirements table lists Nest `^10 || ^11`, and the installed `@nx/nest@23.1.1` package declares `@nestjs/common` and `@nestjs/core` peers as `>=10 <12`. Nest 12 is therefore outside the supported Nx integration matrix. This is specifically an `@nx/nest` tooling/support statement, not evidence that the Nx task runner or every other Nx plugin is runtime-incompatible with a Nest 12 process. [Nx Nest requirements](https://nx.dev/docs/technologies/node/nest/introduction), [`@nx/nest` 23.1.1 package source](https://github.com/nrwl/nx/blob/23.1.1/packages/nest/package.json)
- `nestjs-zod@5.5.0` peers only with Nest 10/11 and Swagger 7/8/11. The starter uses it for DTO wrappers, request validation, response serialization, and OpenAPI cleanup, so forcing Nest/Swagger 12 would put a central contract boundary into an unsupported peer state. [`nestjs-zod` 5.5.0 package metadata](https://registry.npmjs.org/nestjs-zod/5.5.0)

The lowest-risk sequence is:

1. Wait for explicit `@nx/nest` Nest 12 support, or make a deliberate decision to remove it after inventorying which of its generators the guide promises. Version 23.1.1 publishes generators but no executors, so removal would affect scaffolding rather than the existing runtime target graph. [`@nx/nest` package manifest](https://github.com/nrwl/nx/blob/23.1.1/packages/nest/package.json), [generator manifest](https://github.com/nrwl/nx/blob/23.1.1/packages/nest/generators.json)
2. Replace `nestjs-zod` with Nest 12's native Standard Schema facilities, or wait for a release that declares Nest/Swagger 12 support.
3. Upgrade all official `@nestjs/*` packages together while retaining CJS, Jest, Fastify, and the current builder.
4. Consider native ESM, a different builder, and Vitest as separate changes after the framework-only upgrade is green.

This staged approach follows Nest's own position that application ESM conversion is optional and avoids combining four independently risky migrations. [Nest 12 release](https://github.com/nestjs/nest/releases/tag/v12.0.0), [migration guide](https://docs.nestjs.com/migration-guide)

## Current starter baseline

The relevant implementation is in [package.json](../../package.json), [apps/api/project.json](../../apps/api/project.json), [apps/api/webpack.config.js](../../apps/api/webpack.config.js), and [libs/api/application/src/lib/create-api-application.ts](../../libs/api/application/src/lib/create-api-application.ts).

- Nx and all official Nx plugins are 23.1.1. Nest common/core/platform-fastify are 11.2.3; Swagger is 11.4.7; Fastify is 5.11.3; `nestjs-zod` is 5.5.0.
- API source, API libraries, migration/OpenAPI scripts, migration bundle, and Jest API tests are explicitly CommonJS. The root package has no `type: module`.
- Production uses a custom `webpack-cli` + `NxAppWebpackPlugin` build. The migration production entry is separately bundled by esbuild as CJS.
- Development migration and OpenAPI generation run through `ts-node` with `tsconfig-paths/register` and forced CJS compiler options.
- The API uses Fastify, a global `nestjs-zod` validation pipe and serializer, a catch-all Problem Details filter, `enableShutdownHooks()`, and one `OnApplicationShutdown` database closer.
- The API E2E suite uses Fastify `app.inject()`, Testcontainers, and `app.close()`, and asserts OpenAPI 3.1, Problem Details, database readiness, and pgvector migration behavior.
- Development, CI, and the Dockerfile pin Node 24.20.0; `package.json` rejects Node versions below the Nest 12 CLI floor of 24.15.0 and the next major. Image publishers may additionally pin a reviewed digest when immutable base-image identity is required.

## ESM and Node.js

Nest 12's core packages are ESM-only (`@nestjs/core` declares `"type": "module"`), but Nest explicitly says an existing CJS application may remain CJS because supported Node releases can load synchronous ESM through `require(esm)`. Converting this starter's own code to ESM is not required for the framework upgrade. Nest requires Node 20.19+ or 22.12+ to run an app. Its CLI/schematics have a stricter and discontinuous floor: 22.22.3+, 24.15+, or 26+; Node 21, 23, 25, and early Node 24 are excluded. [`@nestjs/core` 12 package metadata](https://github.com/nestjs/nest/blob/v12.0.0/packages/core/package.json), [Nest migration guide](https://docs.nestjs.com/migration-guide#nodejs-requirements), [Node `require(esm)` history](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require)

Consequences for this starter:

- Standardize development, CI, and Docker on Node `>=24.15` if Node 24 is the chosen line. Add an `engines.node` policy and a version-manager file; do not rely on a floating Docker major alone.
- A CJS framework-only upgrade should preserve `module: commonjs`, `.cjs` Jest configs, the CJS migration bundle, and the existing relative imports. It still needs runtime proof because webpack externals and test transforms will ultimately ask Node to load Nest's ESM packages.
- A later native-ESM migration is cross-cutting: add `type: module`, use `module`/`moduleResolution: nodenext`, add `.js` extensions to relative imports that reach emitted files, replace CJS globals such as `__dirname`, and rename or rewrite CJS configs. Nest warns that the nearest `package.json` changes all affected TypeScript files at once; TypeScript likewise documents that `node16`/`nodenext` determine each file's module format from extensions and the nearest `package.json`. [Nest ESM migration](https://docs.nestjs.com/migration-guide#switching-your-project-to-esm), [TypeScript Node module-format rules](https://www.typescriptlang.org/docs/handbook/modules/reference.html#node16-node18-node20-nodenext)
- Workspace path aliases are an extra concern for source-executed scripts. `ts-node` supports native ESM only through `--esm`/its loader, while its own docs say TypeScript `paths` describe mappings the runtime or build tool must implement. The current CJS `tsconfig-paths/register` path is therefore simpler and should remain for the initial upgrade. [ts-node ESM and paths documentation](https://github.com/TypeStrong/ts-node#native-ecmascript-modules)
- If scripts later become ESM, prefer proving the already-installed `tsx` runner or compiling them before execution instead of making a production path depend on experimental loader hooks. Node documents `tsx` as a full-TypeScript-support runner. [Node TypeScript docs](https://nodejs.org/api/typescript.html#full-typescript-support)

## Nx and builder choices

`@nx/nest@23.1.1` is a CommonJS, generator-only package: its package manifest exposes `generators.json` and no executor manifest, depends on `@nestjs/schematics@^11`, and peers with Nest 10/11 only. Its application generator asserts the supported Nest version, delegates project creation to `@nx/node`, forces `bundler: 'webpack'`, defaults tests to Jest, describes its non-solution TypeScript setup as a "commonjs context," and installs the Nest 11 package line. Those are concrete module-format and dependency assumptions in the Nx 23 scaffolding path; they do not apply automatically to hand-maintained targets that do not invoke the generator. [`@nx/nest` manifest](https://github.com/nrwl/nx/blob/23.1.1/packages/nest/package.json), [application generator](https://github.com/nrwl/nx/blob/23.1.1/packages/nest/src/generators/application/application.ts), [normalized Node generator options](https://github.com/nrwl/nx/blob/23.1.1/packages/nest/src/generators/application/lib/normalize-options.ts), [TypeScript update](https://github.com/nrwl/nx/blob/23.1.1/packages/nest/src/generators/application/lib/update-tsconfig.ts), [Nest version constants](https://github.com/nrwl/nx/blob/23.1.1/packages/nest/src/utils/versions.ts), [dependency installation](https://github.com/nrwl/nx/blob/23.1.1/packages/nest/src/utils/ensure-dependencies.ts)

For this starter, that yields two distinct paths:

- **CommonJS consumer path:** this is explicitly supported by Nest 12 on the documented Node floors and matches the current Nx 23 generator's module/build assumptions. It remains an unsupported dependency combination for `@nx/nest@23.1.1`, so acceptance requires resolving/removing that peer conflict and proving webpack externals, Jest transforms, source-run scripts, and production packaging. [Nest CommonJS guidance](https://docs.nestjs.com/migration-guide#esm-packages), [Nx application generator options](https://github.com/nrwl/nx/blob/23.1.1/packages/nest/src/generators/application/lib/normalize-options.ts)
- **ESM-native path:** Nest 12 supports and scaffolds it, but `@nx/nest@23.1.1` does not provide a Nest-12/ESM application preset. Adopting it in this workspace means owning the TypeScript, import-specifier, config-file, runner, and bundler changes directly. Nothing in the examined Nx metadata proves that Nx orchestration itself forbids this path; it is simply outside the documented `@nx/nest` 23 integration. [Nest ESM migration](https://docs.nestjs.com/migration-guide#switching-your-project-to-esm), [Nx Nest requirements](https://nx.dev/docs/technologies/node/nest/introduction)

Nest CLI 12 makes Rspack the default for Nest CLI monorepos and deprecates its `--webpack`, `--webpackPath`, and `nest-cli.json` webpack settings. This starter does not invoke those Nest CLI facilities: it invokes `webpack-cli` directly with Nx's webpack plugin. The deprecation therefore does not directly make the current build invalid, but it is a signal to re-evaluate the builder once Nx officially supports Nest 12. [Nest builder migration note](https://docs.nestjs.com/migration-guide#webpack-deprecation-in-cli-workflows)

The choices should be tested, not bundled into the first upgrade:

- Keep webpack initially: least change and retains the existing asset copy, generated package, pruned lockfile, workspace-module copy, and Docker behavior. Prove both development and production builds against ESM-only Nest dependencies.
- Prototype Rspack separately: closest to the new Nest CLI default and broadly webpack-compatible, but custom/plugin behavior still needs verification. [Nx Rspack documentation](https://nx.dev/docs/technologies/build-tools/rspack/introduction)
- Prototype `@nx/esbuild` separately: Nx's executor supports Node ESM/CJS, assets, type checking, and generated package metadata, but the starter currently invokes esbuild directly only for its migration bundle and does not install the `@nx/esbuild` plugin. Reproduce every packaging/Docker output before switching. [Nx esbuild executor](https://nx.dev/docs/technologies/build-tools/esbuild/executors)

Consequently, a reusable guide should version-gate its generator commands and inspect their dry-run output rather than assume Nest CLI 12 defaults apply to Nx-generated projects.

## Standard Schema versus `nestjs-zod`

Nest 12 natively accepts Standard Schema objects on `@Body`, `@Query`, `@Param`, and `@RawBody`; `StandardSchemaValidationPipe` performs validation and defaults to returning transformed values. `StandardSchemaSerializerInterceptor` uses a schema supplied by `@SerializeOptions` to validate/transform responses. [Migration guide](https://docs.nestjs.com/migration-guide#route-decorator-schemas), [validation pipe source](https://github.com/nestjs/nest/blob/v12.0.0/packages/common/pipes/standard-schema-validation.pipe.ts), [serializer source](https://github.com/nestjs/nest/blob/v12.0.0/packages/common/serializer/standard-schema-serializer.interceptor.ts)

Swagger 12 can consume the same route metadata. A library exposing the Standard JSON Schema extension needs no converter; otherwise `SwaggerDocumentOptions.standardSchemaConverter` must convert input and output forms. Swagger's official Zod example uses `zod-openapi` and targets OpenAPI 3.0. That is not evidence that this starter's present OpenAPI 3.1 output, component reuse, or cleanup behavior will remain byte-for-byte stable. [Nest Swagger Standard Schema docs](https://docs.nestjs.com/openapi/introduction#standard-schema-zod-valibot)

Replacing `nestjs-zod` is promising because it removes DTO wrapper classes and an unsupported integration dependency, but it is not a mechanical package removal. Map and verify all of these responsibilities:

- `createZodDto` and `@ZodResponse` -> route/response Standard Schema metadata and explicit Swagger response descriptions/statuses.
- Global `ZodValidationPipe` -> `StandardSchemaValidationPipe`, configured with an `exceptionFactory` if structured validation issues must be retained.
- Global `ZodSerializerInterceptor` -> `StandardSchemaSerializerInterceptor` plus `@SerializeOptions({ schema })`.
- `cleanupOpenApiDoc(..., { version: '3.1' })` -> native Swagger 12 output/converter and a golden OpenAPI diff.
- `ZodValidationException`/`ZodSerializationException` branches in the Problem Details filter -> native exceptions. The native validation pipe defaults to an HTTP exception containing flattened messages, while the native serializer throws a generic `Error` with issue messages. The filter must preserve safe 400/500 status, structured issue paths/codes if required by the contract, `application/problem+json`, and secret redaction.

## Tests, Fastify, errors, and shutdown

Nest 12 does not force a test-runner migration: `@nestjs/testing` remains runner-agnostic, CommonJS projects may keep Jest, and Vitest is only the default for newly generated ESM projects. Keep Jest during the framework-only upgrade. Native Jest ESM remains an explicitly separate setup involving ESM-emitting transforms, VM modules, `@jest/globals`, and different mocking semantics. [Nest testing migration](https://docs.nestjs.com/migration-guide#testing-stack), [Jest ESM docs](https://jestjs.io/docs/ecmascript-modules)

Fastify 5 remains the adapter's dependency line in Nest 12. Keeping `app.inject()` is appropriate: Fastify documents injection as its test method and notes that it waits for registered plugins to become ready. Continue closing the application/container after tests. [Nest 12 Fastify package](https://github.com/nestjs/nest/blob/v12.0.0/packages/platform-fastify/package.json), [Fastify testing](https://fastify.dev/docs/latest/Guides/Testing/)

Two Nest 12 behavior changes need explicit regression coverage:

- HTTP adapter error mapping changed across core, Express, and Fastify. The catch-all `ProblemDetailsFilter` intentionally replaces Nest's default body, including the new optional `HttpExceptionOptions.errorCode`, so assert status, media type, body, and redaction for validation 400, serialization 500, ordinary `HttpException`, unknown error 500, 404, and database 503. [Nest release breaking changes](https://github.com/nestjs/nest/releases/tag/v12.0.0#breaking-changes)
- Lifecycle hooks now run by component hierarchy level. The starter currently has only one Nest shutdown hook (`DatabaseLifecycle.onApplicationShutdown`), so there is no observed inter-provider ordering dependency, but add tests that `app.close()` and signal-driven shutdown close the database exactly once and that init/bootstrap failures do not leak a handle. [Lifecycle migration note](https://docs.nestjs.com/migration-guide#lifecycle-hook-ordering)

## Safe upgrade experiment and acceptance matrix

### Local compatibility spike (3 September 2026)

Two disposable copies of this exact working tree were exercised on Node 24.20.0 with the official Nest 12.0.0 package line. The spike was intentionally kept outside the reference implementation.

The CommonJS-consumer path produced a mixed result:

- Node loaded `@nestjs/core` successfully through both `require()` and native `import`, the existing webpack API production build completed, and the corrected `ts-node` OpenAPI utility ran successfully.
- `pnpm peers check` failed: `@nx/nest@23.1.1` and `nestjs-zod@5.5.0` reject Nest 12, and `nestjs-zod` also rejects Swagger 12. A successful auto-peer install therefore did not produce a supported graph.
- The existing Jest/ts-jest API suites failed before running tests because Jest evaluated `@nestjs/common` as CommonJS and could not parse its ESM entrypoint. This directly disproves a version-number-only upgrade even though ordinary Node `require(esm)` works.

The native-ESM path was then started by adding `type: module` and switching the API TypeScript configs to NodeNext. Nx could not construct the project graph because the existing `apps/api/webpack.config.js` became ESM while still using `require` and `module.exports`. Renaming or rewriting that config is only the first of the documented cross-cutting changes; the branch was stopped at this earliest decisive failure rather than partially converting production code.

Verdict: retain Nest 11/CommonJS. The CommonJS path is the smaller future migration, but it still needs supported Nx/contract dependencies and a Jest strategy. Native ESM should remain a subsequent, independent migration rather than a prerequisite for Nest 12.

The repository has `@nestjs/schematics` but no local `@nestjs/cli` and no `nest-cli.json`. Do not run `nest upgrade` as if this were a Nest CLI-owned workspace. Once the peer blockers are resolved, use the official command only as a dry-run/reference in a disposable branch, then deliberately align every used `@nestjs/*` package (including testing, Fastify adapter, and Swagger) with the same release line. `pnpm-workspace.yaml` enables automatic peer installation, so a successful install is insufficient evidence; inspect the resolved graph for one Nest major and zero incompatible peers.

Accept a Nest 12 compatibility branch only after all of the following pass on the documented minimum Node and the Docker runtime:

- Fresh frozen pnpm install with no unsupported peers and only one Nest major.
- Lint, strict typecheck, and unit tests.
- API webpack development/production builds and `@nx/js:node` serve.
- Source-run `migrate` and `openapi-generate` commands.
- Production CJS migration bundle, pruned install, Docker image build, migration, startup, and health check.
- Full Fastify injection E2E, including the expanded validation, serialization, exception, redaction, and shutdown cases above.
- Golden diff of committed OpenAPI 3.1 and regenerated web client types.
- Only after that, independent prototypes for native ESM and Rspack/esbuild, each with the same matrix.

## Watch points

- Nx's published support table and the versioned `@nx/nest` peer range are the compatibility authorities; re-check both rather than inferring support from a successful build.
- Track `nestjs-zod` releases if retaining its richer decorators is preferred; do not use `--force` as the reusable guide's default.
- Pin Node's exact supported line in CI and development tooling before testing the migration. Nest's CLI floor can be higher than its runtime floor.
