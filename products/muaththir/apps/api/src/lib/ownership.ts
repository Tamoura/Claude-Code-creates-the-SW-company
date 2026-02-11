import { FastifyInstance } from 'fastify';
import { NotFoundError } from './errors';

export async function verifyChildOwnership(
  fastify: FastifyInstance,
  childId: string,
  parentId: string
) {
  const child = await fastify.prisma.child.findFirst({
    where: { id: childId, parentId },
  });
  if (!child) {
    throw new NotFoundError('Child not found');
  }
  return child;
}
