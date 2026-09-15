import { resolve } from 'node:path';
import { createDatabase } from '@nx-react-nest-starter/api-database';
import { loadMigrationConfig } from '@nx-react-nest-starter/api-application';

async function run() {
  try {
    process.loadEnvFile('apps/api/.env');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const config = loadMigrationConfig(process.env);
  const database = createDatabase(config.databaseUrl);
  const migrationsFolder = resolve(
    process.env.MIGRATIONS_DIR ?? 'libs/api/database/drizzle',
  );

  try {
    await database.migrate(migrationsFolder);
  } finally {
    await database.close();
  }
}

run().catch((error: unknown) => {
  console.error('Migration failed', error);
  process.exitCode = 1;
});
