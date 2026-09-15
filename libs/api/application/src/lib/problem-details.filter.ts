import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ProblemDetailsSchema,
  ValidationProblemDetailsSchema,
} from '@nx-react-nest-starter/shared-contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { STATUS_CODES } from 'node:http';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const request = host.switchToHttp().getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    if (exception instanceof HttpException) status = exception.getStatus();
    if (exception instanceof ZodSerializationException)
      status = HttpStatus.INTERNAL_SERVER_ERROR;

    const baseProblem = {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Request Failed',
      status,
      instance: request.url.split('?', 1)[0] || '/',
    };

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      const problem = ValidationProblemDetailsSchema.parse({
        ...baseProblem,
        errors:
          zodError instanceof ZodError
            ? zodError.issues.map((issue) => ({
                path: issue.path,
                code: issue.code,
                message: 'Invalid value.',
              }))
            : [],
      });
      response.status(status).type('application/problem+json').send(problem);
      return;
    }

    const problem = ProblemDetailsSchema.parse(baseProblem);
    response.status(status).type('application/problem+json').send(problem);
  }
}
