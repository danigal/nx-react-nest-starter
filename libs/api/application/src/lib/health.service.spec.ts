import type { Database } from '@nx-react-nest-starter/api-database';
import { HealthService } from './health.service';

function database(checkReady: () => Promise<void>): Database {
  return { checkReady, close: jest.fn(), migrate: jest.fn() };
}

describe('HealthService', () => {
  it('does not query the database for liveness', () => {
    const checkReady = jest.fn();
    expect(new HealthService(database(checkReady)).live()).toEqual({
      status: 'ok',
    });
    expect(checkReady).not.toHaveBeenCalled();
  });

  it('redacts database failures behind a service-unavailable exception', async () => {
    const service = new HealthService(
      database(async () => {
        throw new Error('secret host');
      }),
    );
    await expect(service.ready()).rejects.toMatchObject({ status: 503 });
  });
});
