import { z } from 'zod';

const booleanFromEnvironment = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_HOST: z.string().min(1).default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  API_DOCS_ENABLED: booleanFromEnvironment.optional(),
});

export interface ApiConfig {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  databaseUrl: string;
  docsEnabled: boolean;
}

export function loadApiConfig(environment: NodeJS.ProcessEnv): ApiConfig {
  const value = environmentSchema.parse(environment);
  return {
    nodeEnv: value.NODE_ENV,
    host: value.API_HOST,
    port: value.API_PORT,
    databaseUrl: value.DATABASE_URL,
    docsEnabled: value.API_DOCS_ENABLED ?? value.NODE_ENV !== 'production',
  };
}

export function loadMigrationConfig(environment: NodeJS.ProcessEnv) {
  const nodeEnv = z
    .enum(['development', 'test', 'production'])
    .default('development')
    .parse(environment['NODE_ENV']);
  const databaseUrl = z
    .string()
    .url()
    .parse(
      environment['MIGRATION_DATABASE_URL'] ??
        (nodeEnv === 'production' ? undefined : environment['DATABASE_URL']),
    );
  return { databaseUrl };
}
