import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { orchestratorRoutes } from './routes/orchestrator';
import { healthRoutes } from './routes/health';
import { modelsRoutes } from './routes/models';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(healthRoutes);
await app.register(modelsRoutes);
await app.register(orchestratorRoutes);

const PORT = Number(process.env.PORT) || 5007;

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Shipwright API running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
