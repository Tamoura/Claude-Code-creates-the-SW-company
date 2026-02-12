import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { differenceInYears } from 'date-fns';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../lib/errors';
import { parsePagination, paginatedResult } from '../lib/pagination';
import { verifyChildOwnership } from '../lib/ownership';
import { getAgeBand } from '../utils/age-band';
import { Child } from '@prisma/client';

const createChildSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  dateOfBirth: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date()),
  gender: z.enum(['male', 'female']).optional(),
  medicalNotes: z.string().max(1000, 'Medical notes must be 1000 characters or fewer').optional().nullable(),
  allergies: z.array(z.string()).optional(),
  specialNeeds: z.string().max(500, 'Special needs must be 500 characters or fewer').optional().nullable(),
});

const updateChildSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer').optional(),
  dateOfBirth: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .optional(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  medicalNotes: z.string().max(1000, 'Medical notes must be 1000 characters or fewer').optional().nullable(),
  allergies: z.array(z.string()).optional(),
  specialNeeds: z.string().max(500, 'Special needs must be 500 characters or fewer').optional().nullable(),
});

function validateBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message || 'Validation failed',
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  return parsed.data;
}

function validateAge(dateOfBirth: Date): void {
  const ageInYears = differenceInYears(new Date(), dateOfBirth);
  if (ageInYears < 3 || ageInYears > 16) {
    throw new BadRequestError('Child must be between 3 and 16 years old');
  }
}

function childToResponse(child: Child) {
  const ageBand = getAgeBand(child.dateOfBirth);
  return {
    id: child.id,
    name: child.name,
    dateOfBirth: child.dateOfBirth.toISOString().split('T')[0],
    gender: child.gender,
    ageBand,
    photoUrl: child.photoUrl,
    medicalNotes: child.medicalNotes,
    allergies: child.allergies,
    specialNeeds: child.specialNeeds,
    createdAt: child.createdAt.toISOString(),
    updatedAt: child.updatedAt.toISOString(),
  };
}

const childrenRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/children — Create a child profile
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { name, dateOfBirth: dobString, gender, medicalNotes, allergies, specialNeeds } = validateBody(
      createChildSchema,
      request.body
    );

    const dateOfBirth = new Date(dobString);
    validateAge(dateOfBirth);

    const parent = request.currentUser!;

    // Free tier: max 1 child
    if (parent.subscriptionTier === 'free') {
      const childCount = await fastify.prisma.child.count({
        where: { parentId: parent.id },
      });
      if (childCount >= 1) {
        throw new ForbiddenError(
          'Free tier allows 1 child. Upgrade to premium for unlimited children.'
        );
      }
    }

    const child = await fastify.prisma.child.create({
      data: {
        parentId: parent.id,
        name,
        dateOfBirth,
        gender: gender ?? null,
        medicalNotes: medicalNotes ?? null,
        allergies: allergies ?? [],
        specialNeeds: specialNeeds ?? null,
      },
    });

    return reply.code(201).send(childToResponse(child));
  });

  // GET /api/children — List parent's children
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const { page, limit } = parsePagination(
      request.query as { page?: string; limit?: string }
    );

    const where = { parentId: parent.id };

    const [children, total] = await Promise.all([
      fastify.prisma.child.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { observations: true },
          },
          milestones: {
            select: { achieved: true },
          },
        },
      }),
      fastify.prisma.child.count({ where }),
    ]);

    const data = children.map((child) => {
      const totalMilestones = child.milestones.length;
      const achievedMilestones = child.milestones.filter(
        (m) => m.achieved
      ).length;

      return {
        ...childToResponse(child),
        observationCount: child._count.observations,
        milestoneProgress: {
          total: totalMilestones,
          achieved: achievedMilestones,
        },
      };
    });

    return reply.code(200).send(paginatedResult(data, total, { page, limit }));
  });

  // GET /api/children/:id — Get single child
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const { id } = request.params as { id: string };

    const child = await verifyChildOwnership(fastify, id, parent.id);

    return reply.code(200).send(childToResponse(child));
  });

  // PATCH /api/children/:id — Update child
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const { id } = request.params as { id: string };

    await verifyChildOwnership(fastify, id, parent.id);

    const updates = validateBody(updateChildSchema, request.body);

    const data: Record<string, unknown> = {};

    if (updates.name !== undefined) {
      data.name = updates.name;
    }

    if (updates.dateOfBirth !== undefined) {
      const newDob = new Date(updates.dateOfBirth);
      validateAge(newDob);
      data.dateOfBirth = newDob;
    }

    if (updates.gender !== undefined) {
      data.gender = updates.gender;
    }

    if (updates.medicalNotes !== undefined) {
      data.medicalNotes = updates.medicalNotes;
    }

    if (updates.allergies !== undefined) {
      data.allergies = updates.allergies;
    }

    if (updates.specialNeeds !== undefined) {
      data.specialNeeds = updates.specialNeeds;
    }

    const updated = await fastify.prisma.child.update({
      where: { id },
      data,
    });

    return reply.code(200).send(childToResponse(updated));
  });

  // DELETE /api/children/:id — Delete child
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const { id } = request.params as { id: string };

    await verifyChildOwnership(fastify, id, parent.id);

    await fastify.prisma.child.delete({
      where: { id },
    });

    return reply.code(204).send();
  });
};

export default childrenRoutes;
