import { z } from 'zod';
import { ValidationError } from '../lib/errors';

/**
 * Validate a request body against a Zod schema.
 * Throws a ValidationError with field-level errors if validation fails.
 */
export function validateBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message || 'Validation failed',
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  return parsed.data;
}

/**
 * Validate request query parameters against a Zod schema.
 * Throws a ValidationError with field-level errors if validation fails.
 */
export function validateQuery<T>(schema: z.ZodType<T>, query: unknown): T {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message || 'Validation failed',
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  return parsed.data;
}
