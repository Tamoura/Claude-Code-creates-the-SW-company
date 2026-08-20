import { buildApp } from './app';
import { getConfig } from './config';

async function main(): Promise<void> {
  const app = await buildApp();
  const config = getConfig();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ msg: 'Shutting down', signal });
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(
      `ConnectBPM API listening on http://${config.HOST}:${config.PORT}`
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
