import Fastify from 'fastify';
import cors from '@fastify/cors';
import { overviewRoutes } from './routes/v1/overview.js';
import { productRoutes } from './routes/v1/products.js';
import { agentRoutes } from './routes/v1/agents.js';
import { activityRoutes } from './routes/v1/activity.js';
import { componentRoutes } from './routes/v1/components.js';
import { infrastructureRoutes } from './routes/v1/infrastructure.js';
import { invokeRoutes } from './routes/v1/invoke.js';
import { workflowRoutes } from './routes/v1/workflows.js';
import { auditReportRoutes } from './routes/v1/audit-reports.js';
import { operationsRoutes } from './routes/v1/operations.js';
import { healthScorecardRoutes } from './routes/v1/health-scorecard.js';
import { gitAnalyticsRoutes } from './routes/v1/git-analytics.js';
import { dependencyGraphRoutes } from './routes/v1/dependency-graph.js';
import { knowledgeBaseRoutes } from './routes/v1/knowledge-base.js';
import { qualityGatesRoutes } from './routes/v1/quality-gates.js';
import { sprintBoardRoutes } from './routes/v1/sprint-board.js';
import { alertsRoutes } from './routes/v1/alerts.js';
import { settingsRoutes } from './routes/v1/settings.js';
import { simulationRoutes } from './routes/v1/simulations.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3113',
    credentials: true,
  });

  // Health check
  app.get('/api/v1/health', async () => ({
    status: 'healthy',
    service: 'command-center-api',
    timestamp: new Date().toISOString(),
  }));

  // Routes
  await app.register(overviewRoutes, { prefix: '/api/v1' });
  await app.register(productRoutes, { prefix: '/api/v1' });
  await app.register(agentRoutes, { prefix: '/api/v1' });
  await app.register(activityRoutes, { prefix: '/api/v1' });
  await app.register(componentRoutes, { prefix: '/api/v1' });
  await app.register(infrastructureRoutes, { prefix: '/api/v1' });
  await app.register(invokeRoutes, { prefix: '/api/v1' });
  await app.register(workflowRoutes, { prefix: '/api/v1' });
  await app.register(auditReportRoutes, { prefix: '/api/v1' });
  await app.register(operationsRoutes, { prefix: '/api/v1' });
  await app.register(healthScorecardRoutes, { prefix: '/api/v1' });
  await app.register(gitAnalyticsRoutes, { prefix: '/api/v1' });
  await app.register(dependencyGraphRoutes, { prefix: '/api/v1' });
  await app.register(knowledgeBaseRoutes, { prefix: '/api/v1' });
  await app.register(qualityGatesRoutes, { prefix: '/api/v1' });
  await app.register(sprintBoardRoutes, { prefix: '/api/v1' });
  await app.register(alertsRoutes, { prefix: '/api/v1' });
  await app.register(settingsRoutes, { prefix: '/api/v1' });
  await app.register(simulationRoutes, { prefix: '/api/v1' });

  return app;
}
