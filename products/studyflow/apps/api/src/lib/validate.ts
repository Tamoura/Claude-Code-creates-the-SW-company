import { z, ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from './errors';

/**
 * Validates `data` against a Zod schema, returning the parsed (output) value or
 * throwing a `ValidationError` (400, RFC 7807) with field-level messages. Used
 * by handlers for body/query/params (architecture.md §4.2).
 */
export function validate<S extends ZodTypeAny>(
  schema: S,
  data: unknown
): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}

export function toValidationError(error: ZodError): ValidationError {
  const fieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const errors: Record<string, string[]> = {};
  for (const [key, msgs] of Object.entries(fieldErrors)) {
    if (msgs && msgs.length > 0) {
      errors[key] = msgs;
    }
  }
  const formErrors = error.flatten().formErrors;
  if (formErrors.length > 0) {
    errors._ = formErrors;
  }
  return new ValidationError('Request validation failed', errors);
}
