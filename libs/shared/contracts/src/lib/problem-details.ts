import { z } from 'zod';

export const ProblemDetailsSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int().min(400).max(599),
    detail: z.string().optional(),
    instance: z.string().optional(),
  })
  .strict();

export const ValidationIssueSchema = z
  .object({
    path: z.array(z.union([z.string(), z.number()])),
    code: z.string(),
    message: z.string(),
  })
  .strict();

export const ValidationProblemDetailsSchema = ProblemDetailsSchema.extend({
  errors: z.array(ValidationIssueSchema),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
export type ValidationProblemDetails = z.infer<
  typeof ValidationProblemDetailsSchema
>;
