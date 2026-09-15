import { HttpException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { z } from 'zod';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import { ProblemDetailsFilter } from './problem-details.filter';

function httpHost(url: string) {
  const reply = {
    status: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => reply,
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;
  return { host, reply };
}

describe('ProblemDetailsFilter', () => {
  it('redacts query values and validation messages', () => {
    const result = z.string().min(10).safeParse('secret');
    if (result.success) throw new Error('Expected validation to fail');
    const { host, reply } = httpHost('/api/example?token=secret');

    new ProblemDetailsFilter().catch(
      new ZodValidationException(result.error),
      host,
    );

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.type).toHaveBeenCalledWith('application/problem+json');
    expect(reply.send).toHaveBeenCalledWith({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      instance: '/api/example',
      errors: [{ path: [], code: 'too_small', message: 'Invalid value.' }],
    });
    expect(JSON.stringify(reply.send.mock.calls)).not.toContain('secret');
  });

  it('maps serialization failures to a safe internal error', () => {
    const { host, reply } = httpHost('/api/health/live');
    const result = z.never().safeParse('database secret');
    if (result.success) throw new Error('Expected serialization to fail');

    new ProblemDetailsFilter().catch(
      new ZodSerializationException(result.error),
      host,
    );

    expect(reply.send).toHaveBeenCalledWith({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: '/api/health/live',
    });
  });

  it('uses the standard title for ordinary HTTP errors', () => {
    const { host, reply } = httpHost('/api/teapot');
    new ProblemDetailsFilter().catch(new HttpException('secret', 418), host);
    expect(reply.send).toHaveBeenCalledWith({
      type: 'about:blank',
      title: "I'm a Teapot",
      status: 418,
      instance: '/api/teapot',
    });
  });
});
