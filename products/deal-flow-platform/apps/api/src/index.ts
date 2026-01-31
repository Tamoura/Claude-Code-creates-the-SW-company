import { buildApp } from './app';
import { getConfig } from './config';

async function start() {
  try {
    const config = getConfig();
    const app = await buildApp();

    await app.listen({ port: config.PORT, host: config.HOST });

    app.server.timeout = 30000;
    app.server.headersTimeout = 31000;
    app.server.keepAliveTimeout = 5000;

    app.log.info(`Server listening on http://${config.HOST}:${config.PORT}`);
    app.log.info(`Environment: ${config.NODE_ENV}`);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        app.log.info(`Received ${signal}, closing server...`);
        await app.close();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
