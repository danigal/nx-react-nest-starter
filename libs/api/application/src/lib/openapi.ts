import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Nx React Nest Starter API')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controller, method) => method,
  });
  const cleaned = cleanupOpenApiDoc(document, { version: '3.1' });
  cleaned.openapi = '3.1.0';
  return cleaned;
}
