import { NestFactory } from '@nestjs/core';
import type { Database } from '@nx-react-nest-starter/api-database';
import { createApiApplication } from './create-api-application';

describe('createApiApplication', () => {
  it('closes the database when Nest construction fails', async () => {
    const failure = new Error('initialization failed');
    const database: Database = {
      checkReady: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
      migrate: jest.fn(),
    };
    jest.spyOn(NestFactory, 'create').mockRejectedValueOnce(failure);

    await expect(
      createApiApplication({
        config: {
          nodeEnv: 'test',
          host: '127.0.0.1',
          port: 3000,
          databaseUrl: 'postgresql://unused/unused',
          docsEnabled: false,
        },
        database,
        logger: false,
      }),
    ).rejects.toBe(failure);
    expect(database.close).toHaveBeenCalledTimes(1);
  });
});
