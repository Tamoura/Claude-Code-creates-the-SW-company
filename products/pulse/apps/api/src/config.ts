import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().default(5003),
  host: z.string().default('0.0.0.0'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  databaseUrl: z.string().min(1),
  databasePoolSize: z.coerce.number().min(1).max(500).default(20),
  databasePoolTimeout: z.coerce.number().min(1).max(300).default(10),

  // Redis (optional)
  redisUrl: z.string().optional(),

  // JWT
  jwtSecret: z.string().min(1),

  // GitHub OAuth
  githubClientId: z.string().default(''),
  githubClientSecret: z.string().default(''),
  githubWebhookSecret: z.string().default(''),

  // Encryption
  encryptionKey: z.string().default(''),

  // Frontend
  frontendUrl: z.string().default('http://localhost:3106'),

  // AI (OpenRouter)
  openrouterApiKey: z.string().optional(),
  openrouterModel: z.string().default('anthropic/claude-sonnet-4-20250514'),

  // Internal
  internalApiKey: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  return configSchema.parse({
    port: process.env.PORT,
    host: process.env.HOST,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    databaseUrl: process.env.DATABASE_URL,
    databasePoolSize: process.env.DATABASE_POOL_SIZE,
    databasePoolTimeout: process.env.DATABASE_POOL_TIMEOUT,
    redisUrl: process.env.REDIS_URL,
    jwtSecret: process.env.JWT_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY,
    frontendUrl: process.env.FRONTEND_URL,
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    openrouterModel: process.env.OPENROUTER_MODEL,
    internalApiKey: process.env.INTERNAL_API_KEY,
  });
}
