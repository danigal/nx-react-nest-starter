import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export interface Database {
  checkReady(): Promise<void>;
  close(): Promise<void>;
  migrate(migrationsFolder: string): Promise<void>;
}

export function createDatabase(databaseUrl: string): Database {
  const client = postgres(databaseUrl, { max: 10 });
  const db = drizzle(client);
  let closed = false;

  return {
    async checkReady() {
      await client`select 1`;
    },
    async close() {
      if (closed) return;
      closed = true;
      await client.end();
    },
    async migrate(migrationsFolder: string) {
      await migrate(db, { migrationsFolder });
    },
  };
}
