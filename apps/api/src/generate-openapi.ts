import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  createApiApplication,
  createOpenApiDocument,
  loadApiConfig,
} from '@nx-react-nest-starter/api-application';

async function generate() {
  const config = loadApiConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
    API_DOCS_ENABLED: 'false',
  });
  const app = await createApiApplication({ config });
  const output = resolve('apps/api/openapi/openapi.json');

  try {
    const document = createOpenApiDocument(app);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(document, null, 2)}\n`);
  } finally {
    await app.close();
  }
}

generate().catch((error: unknown) => {
  console.error('OpenAPI generation failed', error);
  process.exitCode = 1;
});
