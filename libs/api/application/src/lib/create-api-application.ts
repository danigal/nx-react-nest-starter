import { Logger, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import {
  createDatabase,
  type Database,
} from '@nx-react-nest-starter/api-database';
import {
  cleanupOpenApiDoc,
  ZodSerializerInterceptor,
  ZodValidationPipe,
} from 'nestjs-zod';
import { Reflector } from '@nestjs/core';
import { ApplicationModule } from './application.module';
import type { ApiConfig } from './api-config';
import { loadApiConfig } from './api-config';
import { createOpenApiDocument } from './openapi';
import { ProblemDetailsFilter } from './problem-details.filter';

export interface CreateApiApplicationOptions {
  config?: ApiConfig;
  database?: Database;
  logger?: boolean;
}

export async function createApiApplication(
  options: CreateApiApplicationOptions = {},
): Promise<NestFastifyApplication> {
  const config = options.config ?? loadApiConfig(process.env);
  const database = options.database ?? createDatabase(config.databaseUrl);
  let databaseClosed = false;
  const managedDatabase: Database = {
    checkReady: () => database.checkReady(),
    migrate: (migrationsFolder) => database.migrate(migrationsFolder),
    async close() {
      if (databaseClosed) return;
      databaseClosed = true;
      await database.close();
    },
  };
  let app: NestFastifyApplication | undefined;

  try {
    app = await NestFactory.create<NestFastifyApplication>(
      ApplicationModule.register(config, managedDatabase),
      new FastifyAdapter(),
      { logger: options.logger === false ? false : new Logger() },
    );

    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.enableShutdownHooks();

    if (config.docsEnabled) {
      const document = cleanupOpenApiDoc(createOpenApiDocument(app), {
        version: '3.1',
      });
      SwaggerModule.setup('api/docs', app as INestApplication, document, {
        jsonDocumentUrl: 'api/openapi.json',
      });
    }

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    return app;
  } catch (error) {
    try {
      await app?.close();
    } finally {
      await managedDatabase.close();
    }
    throw error;
  }
}
