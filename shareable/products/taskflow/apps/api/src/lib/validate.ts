import type { ZodTypeAny, z } from 'zod';
import { ValidationError } from './errors';

/**
 * Parse untrusted input with a Zod schema and convert failures into a typed
 * ValidationError. Article IV: every boundary is validated at runtime, not
 * only at compile time.
 *
 * Generic over the schema rather than over the parsed type, so callers get the
 * schema's *output* type — defaults applied, coercions done — instead of its
 * looser input type.
 */
export function validate<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }
  return result.data;
}
