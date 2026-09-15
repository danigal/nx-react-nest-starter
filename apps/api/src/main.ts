import 'tslib';
import { Logger } from '@nestjs/common';
import {
  createApiApplication,
  loadApiConfig,
} from '@nx-react-nest-starter/api-application';

async function bootstrap() {
  try {
    process.loadEnvFile('apps/api/.env');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const config = loadApiConfig(process.env);
  const app = await createApiApplication({ config });
  try {
    await app.listen(config.port, config.host);
  } catch (error) {
    await app.close();
    throw error;
  }
  Logger.log(`API listening at http://${config.host}:${config.port}/api`);
}

bootstrap().catch((error: unknown) => {
  Logger.error(
    'API startup failed',
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});
