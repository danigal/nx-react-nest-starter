import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { HealthResponse } from '@nx-react-nest-starter/shared-contracts';
import { ZodResponse } from 'nestjs-zod';
import { HealthResponseDto, ProblemDetailsDto } from './health.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@ApiExtraModels(ProblemDetailsDto)
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  @ApiOperation({ operationId: 'getLiveness' })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'The process is live.',
    type: HealthResponseDto,
  })
  live(): HealthResponse {
    return this.health.live();
  }

  @Get('ready')
  @ApiOperation({ operationId: 'getReadiness' })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'The API and database are ready.',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'A required dependency is unavailable.',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  ready(): Promise<HealthResponse> {
    return this.health.ready();
  }
}
