import { resolve } from 'node:path';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  createApiApplication,
  createOpenApiDocument,
  loadApiConfig,
} from '@nx-react-nest-starter/api-application';
import { createDatabase } from '@nx-react-nest-starter/api-database';
import postgres from 'postgres';

jest.setTimeout(120_000);

describe('health API', () => {
  let container: StartedPostgreSqlContainer;
  let app: NestFastifyApplication;
  let stopped = false;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(
      'pgvector/pgvector:0.8.6-pg18-bookworm',
    ).start();
    const database = createDatabase(container.getConnectionUri());
    await database.migrate(resolve('libs/api/database/drizzle'));
    const config = loadApiConfig({
      NODE_ENV: 'test',
      DATABASE_URL: container.getConnectionUri(),
      API_DOCS_ENABLED: 'false',
    });
    app = await createApiApplication({ config, database, logger: false });
  });

  afterAll(async () => {
    await app?.close();
    if (!stopped) await container?.stop();
  });

  it('serves liveness and database-backed readiness', async () => {
    const live = await app.inject({ method: 'GET', url: '/api/health/live' });
    const ready = await app.inject({ method: 'GET', url: '/api/health/ready' });

    expect(live.statusCode).toBe(200);
    expect(live.json()).toEqual({ status: 'ok' });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toEqual({ status: 'ok' });
  });

  it('applied the checked-in pgvector migration', async () => {
    const sql = postgres(container.getConnectionUri(), { max: 1 });
    try {
      const rows = await sql<
        { extname: string }[]
      >`select extname from pg_extension where extname = 'vector'`;
      expect(rows).toEqual([{ extname: 'vector' }]);
    } finally {
      await sql.end();
    }
  });

  it('publishes the expected OpenAPI contract', () => {
    const document = createOpenApiDocument(app);
    const liveness = document.paths['/api/health/live']?.get;
    const readiness = document.paths['/api/health/ready']?.get;
    const unavailable = readiness?.responses?.['503'];
    expect(document.openapi).toBe('3.1.0');
    expect(Object.keys(document.paths)).toEqual([
      '/api/health/live',
      '/api/health/ready',
    ]);
    expect(liveness?.operationId).toBe('getLiveness');
    expect(readiness?.operationId).toBe('getReadiness');
    expect(liveness?.responses?.['200']).toHaveProperty(
      'content.application/json.schema.$ref',
      '#/components/schemas/HealthResponseDto_Output',
    );
    expect(readiness?.responses?.['200']).toHaveProperty(
      'content.application/json.schema.$ref',
      '#/components/schemas/HealthResponseDto_Output',
    );
    expect(
      unavailable && 'content' in unavailable ? unavailable.content : {},
    ).toHaveProperty(
      'application/problem+json.schema.$ref',
      '#/components/schemas/ProblemDetailsDto',
    );
    expect(document.components?.schemas).toHaveProperty(
      'HealthResponseDto_Output',
    );
    expect(document.components?.schemas).toHaveProperty('ProblemDetailsDto');
  });

  it('uses Problem Details for unknown routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/missing' });
    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.json()).toMatchObject({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      instance: '/api/missing',
    });
  });

  it('returns a safe 503 after the database becomes unavailable', async () => {
    await container.stop();
    stopped = true;
    const response = await app.inject({
      method: 'GET',
      url: '/api/health/ready',
    });

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('postgresql://');
    expect(response.json()).toMatchObject({
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
    });
  });
});
