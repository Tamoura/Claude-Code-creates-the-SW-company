import { buildApp } from './app';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '5005', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  try {
    const app = await buildApp();

    await app.listen({ port: PORT, host: HOST });
    logger.info(`ShariaScreen API running`, {
      port: PORT,
      host: HOST,
      env: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

main();
