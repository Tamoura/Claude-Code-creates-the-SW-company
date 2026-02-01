import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
  anthropicApiKey: string;
  anthropicBaseUrl: string;
  aiModel: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  appUrl: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT || '5004', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: requireEnv('DATABASE_URL'),
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    anthropicApiKey: process.env.NODE_ENV === 'test'
      ? (process.env.ANTHROPIC_API_KEY || 'test-key-not-used')
      : requireEnv('ANTHROPIC_API_KEY'),
    anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL || '',
    aiModel: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
    stripeSecretKey: process.env.NODE_ENV === 'test'
      ? (process.env.STRIPE_SECRET_KEY || 'sk_test_fake')
      : (process.env.STRIPE_SECRET_KEY || ''),
    stripeWebhookSecret: process.env.NODE_ENV === 'test'
      ? (process.env.STRIPE_WEBHOOK_SECRET || 'whsec_fake')
      : (process.env.STRIPE_WEBHOOK_SECRET || ''),
    appUrl: process.env.APP_URL || 'http://localhost:3109',
  };
}

export const config = loadConfig();
