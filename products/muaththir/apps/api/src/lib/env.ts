import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('5005'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('1h'),
  REFRESH_TOKEN_EXPIRY_DAYS: z.string().default('7'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3108'),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs as string[]).join(', ')}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  // Production requires JWT_SECRET
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production');
  }

  validatedEnv = parsed.data;
  return validatedEnv;
}

export function getEnv(): Env {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}
