import { DynamicModule, Module, OnApplicationShutdown } from '@nestjs/common';
import type { Database } from '@nx-react-nest-starter/api-database';
import type { ApiConfig } from './api-config';
import { DATABASE } from './database.token';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(private readonly database: Database) {}

  async onApplicationShutdown() {
    await this.database.close();
  }
}

@Module({})
export class ApplicationModule {
  static register(config: ApiConfig, database: Database): DynamicModule {
    return {
      module: ApplicationModule,
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: DATABASE, useValue: database },
        {
          provide: DatabaseLifecycle,
          useFactory: () => new DatabaseLifecycle(database),
        },
        { provide: 'API_CONFIG', useValue: config },
      ],
    };
  }
}
