import { HealthResponseSchema, ProblemDetailsSchema } from '../index';

describe('shared HTTP contracts', () => {
  it('accepts the health payload and rejects invalid status values', () => {
    expect(HealthResponseSchema.parse({ status: 'ok' })).toEqual({
      status: 'ok',
    });
    expect(() => HealthResponseSchema.parse({ status: 'down' })).toThrow();
  });

  it('accepts safe RFC 9457 problem details', () => {
    expect(
      ProblemDetailsSchema.parse({
        type: 'about:blank',
        title: 'Service Unavailable',
        status: 503,
      }),
    ).toEqual({
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
    });
  });
});
