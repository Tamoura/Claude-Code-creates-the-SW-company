import { buildApp } from './app';
import { getConfig } from './config';

async function main(): Promise<void> {
  const app = await buildApp();
  const config = getConfig();

  try {
    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
    console.log(
      `ConnectIn API running on http://${config.HOST}:${config.PORT}`
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

main();
