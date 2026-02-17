import type { FastifyInstance } from 'fastify';
import { getSprintBoard } from '../../services/sprint-board.service.js';

export async function sprintBoardRoutes(fastify: FastifyInstance) {
  fastify.get('/sprint-board', async () => {
    return getSprintBoard();
  });
}
