/**
 * Environment configuration — validated once, at startup, fail-fast.
 *
 * CONVENTION (binding for all downstream agents):
 *   Never read `process.env` outside this file. Add the variable to
 *   `envSchema`, then read it via `getConfig()`. A missing or malformed
 *   variable must crash the process at boot, never at first use.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().default(5018),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // PostgreSQL is the sole source of truth (ADR-004, ADR-007, ADR-009).
  DATABASE_URL: z.string().min(1),

  // Redis is cache + soft counters ONLY. Never a value correctness depends on.
  REDIS_URL: z.string().optional(),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  FRONTEND_URL: z.string().default('http://localhost:3123'),
  API_URL: z.string().default('http://localhost:5018'),
  CORS_ORIGIN: z.string().default('http://localhost:3123'),

  // ADR-009 — durable job runner. `api` and `runner` ship from one image;
  // this flag decides which role the process plays.
  RUN_JOB_RUNNER: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  JOB_BATCH_SIZE: z.coerce.number().int().positive().default(200),
  JOB_WORKER_COUNT: z.coerce.number().int().positive().default(8),
});

export type Config = z.infer<typeof envSchema>;

let config: Config | undefined;

export function loadConfig(): Config {
  if (config) return config;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  config = result.data;
  return config;
}

export function getConfig(): Config {
  return config ?? loadConfig();
}

/** Test-only: clear the memoised config so a test can re-parse the env. */
export function resetConfigForTests(): void {
  config = undefined;
}
