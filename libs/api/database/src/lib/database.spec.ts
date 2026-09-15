import { createDatabase } from './database';

describe('createDatabase', () => {
  it('creates the adapter without opening a connection eagerly', async () => {
    const database = createDatabase(
      'postgresql://unused:unused@127.0.0.1:1/unused',
    );
    await expect(database.close()).resolves.toBeUndefined();
  });
});
