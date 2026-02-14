import { buildApp } from './app.js';

const PORT = Number(process.env.PORT ?? {{apiPort}});
const HOST = process.env.HOST ?? '0.0.0.0';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`{{displayName}} API running on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
