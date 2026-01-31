import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().default(
    'postgresql://postgres@localhost:5432/deal_flow_dev'
  ),
  JWT_SECRET: z.string().min(16).default('dev-jwt-secret-change-me-in-prod'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  REDIS_URL: z.string().optional(),
  PORT: z.coerce.number().default(5003),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3108'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _config: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!_config) {
    _config = envSchema.parse(process.env);
  }
  return _config;
}

export function resetConfig(): void {
  _config = null;
}
