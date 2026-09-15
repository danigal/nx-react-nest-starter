import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: 'libs/api/database/src/lib/schema.ts',
  out: 'libs/api/database/drizzle',
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
});
