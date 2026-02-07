import { buildApp } from './app.js';
import { logger } from './utils/logger.js';

async function main() {
  const port = parseInt(process.env.PORT || '5003', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    const app = await buildApp();
    await app.listen({ port, host });
    logger.info(`Pulse API server started on ${host}:${port}`);
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

main();
