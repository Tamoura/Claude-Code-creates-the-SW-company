/**
 * Fastify application factory.
 *
 * `buildApp()` constructs a fully-wired Fastify instance without binding a
 * port — the integration tests use it directly via `app.inject()` (real
 * dependencies, no mocks — Article III). `server.ts` calls it then `listen()`s.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import { loadConfig, type AppConfig } from './config.js';
import { registerPlugins } from './plugins/index.js';

export interface BuildAppOptions {
  /** Override the loaded config (used by tests to point at the test DB). */
  config?: AppConfig;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // Structured JSON logs; pretty-printed only in local development.
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z' } }
          : undefined,
    },
    disableRequestLogging: true, // observabilityPlugin emits structured request logs
  });

  await registerPlugins(app);

  // Phase 0 scaffold: no business routes yet. The 13 modules mount their
  // own routes under /api/v1 starting in Phase 1.

  return app;
}
