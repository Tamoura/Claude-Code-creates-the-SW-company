import { config } from './config';
import { buildApp } from './app';

async function start(): Promise<void> {
  const app = await buildApp({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
  });

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`Server running on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
