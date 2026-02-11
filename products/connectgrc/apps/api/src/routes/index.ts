import { FastifyPluginAsync } from 'fastify';
import healthRoutes from './health';
import authRoutes from './auth';
import profileRoutes from './profile';
import assessmentRoutes from './assessments';
import questionsRoutes from './questions';
import jobRoutes from './jobs';
import careerRoutes from './career';
import resourceRoutes from './resources';
import notificationRoutes from './notifications';
import adminRoutes from './admin';

const routes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(profileRoutes);
  await fastify.register(assessmentRoutes);
  await fastify.register(questionsRoutes);
  await fastify.register(jobRoutes);
  await fastify.register(careerRoutes);
  await fastify.register(resourceRoutes);
  await fastify.register(notificationRoutes);
  await fastify.register(adminRoutes);
};

export default routes;
