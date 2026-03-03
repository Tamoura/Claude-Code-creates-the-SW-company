/**
 * config.ts — Environment variable validation
 *
 * Validates ALL required env vars at import time using Zod.
 * App fails immediately with a descriptive error if any are missing.
 * This prevents cryptic runtime errors deep in the call stack.
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // JWT
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_EXPIRY: z.coerce.number().int().positive().default(604800),

  // Server
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(5014),

  // Internal API key for health/metrics endpoints
  INTERNAL_API_KEY: z.string().min(1).optional(),

  // Email — optional in development
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z
    .string()
    .email()
    .default('noreply@ai-fluency.connectsw.com'),

  // Logging
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
});

function validateConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `[AI Fluency API] Invalid or missing environment variables:\n${issues}\n\nSee .env.example for required values.`
    );
  }
  return result.data;
}

export const config = validateConfig();
export type Config = typeof config;
