import { z } from 'zod';
import { logger } from '../utils/logger';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('5010'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  DEFAULT_WRITING_MODEL: z.string().default('anthropic/claude-sonnet-4-5-20250929'),
  DEFAULT_ANALYSIS_MODEL: z.string().default('google/gemini-2.0-flash-001'),
  DEFAULT_IMAGE_MODEL: z.string().default('openai/dall-e-3'),
  FRONTEND_URL: z.string().default('http://localhost:3114'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3114'),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

/**
 * Reset cached validation result. Used in tests to
 * re-run validation with modified environment variables.
 */
export function resetValidatedEnv(): void {
  validatedEnv = null;
}

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

  // Warn about placeholder API key
  if (parsed.data.OPENROUTER_API_KEY === 'sk-or-your-key-here') {
    logger.warn(
      'OPENROUTER_API_KEY is set to placeholder. LLM calls will fail.'
    );
  }

  if (!process.env.ALLOWED_ORIGINS) {
    logger.warn(
      'ALLOWED_ORIGINS is not set. Defaulting to http://localhost:3114.'
    );
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
