import { z, ZodError, ZodSchema } from 'zod';
import { AppError } from '../types/index';

/**
 * Validate data against a Zod schema.
 * Throws AppError(400) on validation failure.
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map((e) => e.message).join(', ');
      throw new AppError(400, 'VALIDATION_ERROR', messages);
    }
    throw err;
  }
}
