import { buildApp } from './app.js';
import { logger } from './utils/logger.js';
import { validateEnvironment } from './utils/env-validator.js';
import { initializeEncryption } from './utils/encryption.js';
import { PaymentExpirationWorker } from './workers/payment-expiration.worker.js';
import { WebhookDeliveryService } from './services/webhook-delivery.service.js';

async function start() {
  try {
    // Validate environment variables before starting
    validateEnvironment();

    // Initialize encryption for webhook secrets
    // Note: WEBHOOK_ENCRYPTION_KEY is optional - if not set, secrets stored in plaintext
    if (process.env.WEBHOOK_ENCRYPTION_KEY) {
      initializeEncryption();
      logger.info('Webhook secret encryption enabled');
    } else {
      logger.warn('WEBHOOK_ENCRYPTION_KEY not set - webhook secrets will be stored in plaintext');
    }

    const app = await buildApp();

    const port = parseInt(process.env.PORT || '5001'); // See .claude/PORT-REGISTRY.md
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    logger.info(`Server listening on http://${host}:${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Start payment expiration worker
    // Runs every 5 minutes (configurable via PAYMENT_EXPIRATION_INTERVAL_MINUTES)
    const expirationIntervalMinutes = parseInt(
      process.env.PAYMENT_EXPIRATION_INTERVAL_MINUTES || '5'
    );
    const webhookService = new WebhookDeliveryService(app.prisma);
    const expirationWorker = new PaymentExpirationWorker(
      app.prisma,
      webhookService,
      expirationIntervalMinutes
    );
    expirationWorker.start();
    logger.info('Payment expiration worker started', {
      intervalMinutes: expirationIntervalMinutes,
    });

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, closing server...`);
        expirationWorker.stop();
        logger.info('Payment expiration worker stopped');
        await app.close();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
