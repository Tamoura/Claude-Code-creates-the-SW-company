import { buildApp } from './app.js';

const PORT = parseInt(process.env.PORT || '5001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start(): Promise<void> {
  try {
    const app = await buildApp({ logger: true });

    await app.listen({ port: PORT, host: HOST });

    console.log(`Server running at http://${HOST}:${PORT}`);
    console.log(`Health check available at http://${HOST}:${PORT}/api/v1/health`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
