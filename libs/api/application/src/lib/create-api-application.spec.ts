import { NestFactory } from '@nestjs/core';
import type { Database } from '@nx-react-nest-starter/api-database';
import type { ApiConfig } from './api-config';
import { createApiApplication } from './create-api-application';

function unusedDatabase(): Database {
  return {
    checkReady: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    migrate: jest.fn(),
  };
}

function config(docsEnabled: boolean): ApiConfig {
  return {
    nodeEnv: 'test',
    host: '127.0.0.1',
    port: 3000,
    databaseUrl: 'postgresql://unused/unused',
    docsEnabled,
  };
}

describe('createApiApplication', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('closes the database when Nest construction fails', async () => {
    const failure = new Error('initialization failed');
    const database = unusedDatabase();
    jest.spyOn(NestFactory, 'create').mockRejectedValueOnce(failure);

    await expect(
      createApiApplication({
        config: config(false),
        database,
        logger: false,
      }),
    ).rejects.toBe(failure);
    expect(database.close).toHaveBeenCalledTimes(1);
  });

  it('serves Swagger UI and OpenAPI JSON when docs are enabled', async () => {
    const app = await createApiApplication({
      config: config(true),
      database: unusedDatabase(),
      logger: false,
    });

    try {
      const docs = await app.inject({ method: 'GET', url: '/api/docs/' });
      const spec = await app.inject({
        method: 'GET',
        url: '/api/openapi.json',
      });

      expect(docs.statusCode).toBe(200);
      expect(docs.headers['content-type']).toMatch(/html/);
      expect(spec.statusCode).toBe(200);
      expect(spec.json()).toMatchObject({
        openapi: '3.1.0',
        info: { title: 'Nx React Nest Starter API' },
      });
    } finally {
      await app.close();
    }
  });
});
