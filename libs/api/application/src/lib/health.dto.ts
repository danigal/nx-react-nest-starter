import {
  HealthResponseSchema,
  ProblemDetailsSchema,
} from '@nx-react-nest-starter/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class HealthResponseDto extends createZodDto(HealthResponseSchema) {}
export class ProblemDetailsDto extends createZodDto(ProblemDetailsSchema) {}
