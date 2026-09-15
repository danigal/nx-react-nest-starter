import createClient from 'openapi-fetch';
import {
  HealthResponseSchema,
  ProblemDetailsSchema,
  type ProblemDetails,
} from '@nx-react-nest-starter/shared-contracts';
import type { paths } from '../generated/api';

export class ApiProblem extends Error {
  constructor(readonly problem: ProblemDetails) {
    super(problem.title);
  }
}

export async function getReadiness() {
  const client = createClient<paths>({ fetch });
  const { data, error } = await client.GET('/api/health/ready');
  if (data) return HealthResponseSchema.parse(data);

  const problem = ProblemDetailsSchema.safeParse(error);
  throw new ApiProblem(
    problem.success
      ? problem.data
      : { type: 'about:blank', title: 'API unavailable', status: 503 },
  );
}
