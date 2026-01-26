import { FastifyPluginAsync, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors,
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    // Log error for debugging
    fastify.log.error(error);

    // Default error response
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      error: error.name || 'Internal Server Error',
      message: statusCode === 500 ? 'Something went wrong' : error.message,
    });
  });
};

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
});
