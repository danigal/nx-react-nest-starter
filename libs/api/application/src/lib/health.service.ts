import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Database } from '@nx-react-nest-starter/api-database';
import type { HealthResponse } from '@nx-react-nest-starter/shared-contracts';
import { DATABASE } from './database.token';

@Injectable()
export class HealthService {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  live(): HealthResponse {
    return { status: 'ok' };
  }

  async ready(): Promise<HealthResponse> {
    try {
      await this.database.checkReady();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Readiness check failed');
    }
  }
}
