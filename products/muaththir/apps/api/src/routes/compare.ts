import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { verifyChildOwnership } from '../lib/ownership';
import { getAgeBand } from '../utils/age-band';
import { validateQuery } from '../utils/validation';
import { ValidationError } from '../lib/errors';
import { calculateChildSummary } from '../services/score-calculator';

const compareQuerySchema = z.object({
  childIds: z.string().min(1, 'childIds is required'),
});

/**
 * Compare API
 *
 * Returns dashboard summaries for multiple children, allowing
 * side-by-side comparison of dimension scores.
 */
const compareRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/children/compare?childIds=id1,id2
  fastify.get('/compare', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parentId = request.currentUser!.id;

    const { childIds: childIdsStr } = validateQuery(
      compareQuerySchema,
      request.query
    );

    const childIds = childIdsStr
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (childIds.length === 0) {
      throw new ValidationError('At least one childId is required', {
        childIds: ['At least one childId is required'],
      });
    }

    // Verify all children belong to this parent
    const children = [];
    for (const childId of childIds) {
      const child = await verifyChildOwnership(fastify, childId, parentId);
      children.push(child);
    }

    // Build dashboard summary for each child using shared calculator
    const results = await Promise.all(
      children.map((child) => {
        const ageBand = getAgeBand(child.dateOfBirth);
        return calculateChildSummary(
          fastify.prisma,
          child.id,
          child.name,
          ageBand
        );
      })
    );

    return reply.send({ children: results });
  });
};

export default compareRoutes;
