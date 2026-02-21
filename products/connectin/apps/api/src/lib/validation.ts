import { ZodError } from 'zod';

export function zodToDetails(
  err: ZodError
): Array<{ field: string; message: string }> {
  return err.errors.map((e) => ({
    field: e.path.join('.') || 'unknown',
    message: e.message,
  }));
}
