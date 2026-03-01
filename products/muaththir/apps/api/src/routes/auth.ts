import { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as crypto from 'crypto';
import { Dimension, Sentiment } from '@prisma/client';
import { hashPassword, verifyPassword, generateRefreshToken } from '../utils/crypto';
import { BadRequestError, ConflictError, UnauthorizedError } from '../lib/errors';
import { validateBody } from '../utils/validation';
import { logger } from '../utils/logger';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

const REFRESH_TOKEN_DAYS = parseInt(
  process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7',
  10
);

interface ParentLike {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  createdAt: Date;
}

function parentToResponse(parent: ParentLike) {
  return {
    id: parent.id,
    email: parent.email,
    name: parent.name,
    subscriptionTier: parent.subscriptionTier,
    createdAt: parent.createdAt.toISOString(),
  };
}

async function issueTokens(
  fastify: FastifyInstance,
  reply: FastifyReply,
  parent: ParentLike
): Promise<string> {
  const accessToken = fastify.jwt.sign(
    { sub: parent.id, email: parent.email, tier: parent.subscriptionTier },
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshTokenValue = generateRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  await fastify.prisma.session.create({
    data: {
      parentId: parent.id,
      token: refreshTokenValue,
      expiresAt,
    },
  });

  reply.setCookie('refreshToken', refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60,
  });

  return accessToken;
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const { name, email, password } = validateBody(
      registerSchema,
      request.body
    );

    try {
      const passwordHash = await hashPassword(password);
      const parent = await fastify.prisma.parent.create({
        data: { name, email, passwordHash },
      });

      const accessToken = await issueTokens(fastify, reply, parent);

      return reply.code(201).send({
        user: parentToResponse(parent),
        accessToken,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError('Email already registered');
      }
      throw error;
    }
  });

  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const { email, password } = validateBody(loginSchema, request.body);

    const parent = await fastify.prisma.parent.findUnique({
      where: { email },
    });

    if (!parent) {
      // Constant-time: run a dummy hash to prevent timing-based email enumeration
      await verifyPassword(password, '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'); // nosemgrep: generic.secrets.security.detected-bcrypt-hash — dummy hash for constant-time comparison, prevents timing-based email enumeration
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await verifyPassword(password, parent.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = await issueTokens(fastify, reply, parent);

    return reply.code(200).send({
      user: parentToResponse(parent),
      accessToken,
    });
  });

  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (refreshToken) {
      await fastify.prisma.session.deleteMany({
        where: { token: refreshToken },
      });
    } else if (request.currentUser) {
      await fastify.prisma.session.deleteMany({
        where: { parentId: request.currentUser.id },
      });
    }

    reply.clearCookie('refreshToken', {
      path: '/api/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return reply.code(200).send({ message: 'Logged out successfully' });
  });

  fastify.post('/refresh', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 hour',
      },
    },
  }, async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError('Missing refresh token');
    }

    const session = await fastify.prisma.session.findUnique({
      where: { token: refreshToken },
      include: { parent: true },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      await fastify.prisma.session.delete({
        where: { id: session.id },
      });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Delete old session (rotation)
    await fastify.prisma.session.delete({
      where: { id: session.id },
    });

    const accessToken = await issueTokens(fastify, reply, session.parent);

    return reply.code(200).send({ accessToken });
  });

  fastify.post('/forgot-password', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '15 minutes',
      },
    },
  }, async (request, reply) => {
    const { email } = validateBody(forgotPasswordSchema, request.body);

    const parent = await fastify.prisma.parent.findUnique({
      where: { email },
    });

    if (parent) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await fastify.prisma.parent.update({
        where: { id: parent.id },
        data: { resetToken, resetTokenExp },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3108';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      await fastify.email.send({
        to: email,
        subject: 'Reset your Muaththir password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset</h2>
            <p>You requested a password reset for your Muaththir account.</p>
            <p>Click the link below to reset your password. This link expires in 1 hour.</p>
            <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            <p style="color: #666; font-size: 12px;">Or copy this link: ${resetUrl}</p>
          </div>
        `,
      });

      logger.info('Password reset token generated', { email });
    } else {
      // Constant-time: burn CPU to prevent timing-based email enumeration
      await hashPassword(crypto.randomBytes(16).toString('hex'));
    }

    return reply.code(200).send({
      message: 'If an account exists, a reset link has been sent',
    });
  });

  fastify.post('/reset-password', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 hour',
      },
    },
  }, async (request, reply) => {
    const { token, password } = validateBody(
      resetPasswordSchema,
      request.body
    );

    const parent = await fastify.prisma.parent.findFirst({
      where: { resetToken: token },
    });

    if (!parent) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    if (!parent.resetTokenExp || parent.resetTokenExp < new Date()) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(password);

    await fastify.prisma.parent.update({
      where: { id: parent.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    return reply.code(200).send({
      message: 'Password has been reset',
    });
  });

  // --- Demo Login ---

  const DEMO_EMAIL = 'demo@muaththir.app';
  const DEMO_PARENT_NAME = 'Demo Parent';
  const DEMO_CHILD_NAME = 'Yusuf';

  const demoObservations: Array<{
    dimension: Dimension;
    content: string;
    sentiment: Sentiment;
    tags: string[];
  }> = [
    // Academic (3)
    {
      dimension: 'academic',
      content: 'Yusuf wrote his name independently for the first time today, forming each letter carefully.',
      sentiment: 'positive',
      tags: ['writing', 'milestone'],
    },
    {
      dimension: 'academic',
      content: 'Counted to 15 while stacking blocks but skipped number 13. Getting close to counting to 20.',
      sentiment: 'neutral',
      tags: ['numeracy', 'counting'],
    },
    {
      dimension: 'academic',
      content: 'Recognised all the letters in his name on a shop sign and got very excited.',
      sentiment: 'positive',
      tags: ['literacy', 'letter-recognition'],
    },
    // Social-Emotional (3)
    {
      dimension: 'social_emotional',
      content: 'Shared his favourite toy with a younger child at the park without being asked.',
      sentiment: 'positive',
      tags: ['sharing', 'empathy'],
    },
    {
      dimension: 'social_emotional',
      content: 'Had difficulty separating at nursery drop-off today. Needed extra reassurance.',
      sentiment: 'needs_attention',
      tags: ['separation-anxiety', 'transition'],
    },
    {
      dimension: 'social_emotional',
      content: 'Used words to express frustration instead of crying when his tower fell down.',
      sentiment: 'positive',
      tags: ['emotional-regulation', 'communication'],
    },
    // Behavioural (3)
    {
      dimension: 'behavioural',
      content: 'Followed the bedtime routine without reminders tonight — brushed teeth, chose a book, and settled quickly.',
      sentiment: 'positive',
      tags: ['routine', 'independence'],
    },
    {
      dimension: 'behavioural',
      content: 'Sat at the table for the full duration of dinner for the first time this week.',
      sentiment: 'positive',
      tags: ['mealtime', 'focus'],
    },
    {
      dimension: 'behavioural',
      content: 'Struggled with taking turns during a board game and needed gentle reminders.',
      sentiment: 'neutral',
      tags: ['turn-taking', 'patience'],
    },
    // Aspirational (3)
    {
      dimension: 'aspirational',
      content: 'Told us he wants to be a doctor when he grows up so he can help people feel better.',
      sentiment: 'positive',
      tags: ['career-interest', 'empathy'],
    },
    {
      dimension: 'aspirational',
      content: 'Showed interest in how buildings are made while we walked past a construction site.',
      sentiment: 'positive',
      tags: ['curiosity', 'engineering'],
    },
    {
      dimension: 'aspirational',
      content: 'Asked if he could learn to swim like the children he saw on television.',
      sentiment: 'neutral',
      tags: ['goal-setting', 'sport'],
    },
    // Islamic (3)
    {
      dimension: 'islamic',
      content: 'Said bismillah before eating without prompting and reminded his sister to do the same.',
      sentiment: 'positive',
      tags: ['dua', 'daily-practice'],
    },
    {
      dimension: 'islamic',
      content: 'Stood beside his father during Maghrib prayer and tried to follow the movements.',
      sentiment: 'positive',
      tags: ['salah', 'role-model'],
    },
    {
      dimension: 'islamic',
      content: 'Asked why we fast in Ramadan and listened attentively to the explanation.',
      sentiment: 'positive',
      tags: ['ramadan', 'curiosity'],
    },
    // Physical (3)
    {
      dimension: 'physical',
      content: 'Rode his balance bike confidently down a gentle slope at the park today.',
      sentiment: 'positive',
      tags: ['gross-motor', 'balance'],
    },
    {
      dimension: 'physical',
      content: 'Struggled to cut along a curved line with scissors. Fine motor skills need more practice.',
      sentiment: 'needs_attention',
      tags: ['fine-motor', 'scissors'],
    },
    {
      dimension: 'physical',
      content: 'Caught a large ball with both hands three times in a row during garden play.',
      sentiment: 'positive',
      tags: ['coordination', 'gross-motor'],
    },
  ];

  fastify.post('/demo-login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    // 1. Find or create demo parent
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await hashPassword(randomPassword);

    const parent = await fastify.prisma.parent.upsert({
      where: { email: DEMO_EMAIL },
      update: {},
      create: {
        email: DEMO_EMAIL,
        name: DEMO_PARENT_NAME,
        passwordHash,
      },
    });

    // 2. Find or create demo child
    let child = await fastify.prisma.child.findFirst({
      where: { parentId: parent.id, isDemo: true },
    });

    if (!child) {
      const fourYearsAgo = new Date();
      fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);

      child = await fastify.prisma.child.create({
        data: {
          parentId: parent.id,
          name: DEMO_CHILD_NAME,
          dateOfBirth: fourYearsAgo,
          gender: 'male',
          isDemo: true,
        },
      });
    }

    // 3. Seed observations if none exist
    const observationCount = await fastify.prisma.observation.count({
      where: { childId: child.id, deletedAt: null },
    });

    if (observationCount === 0) {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      const observationData = demoObservations.map((obs, index) => {
        // Spread observations over the last 30 days
        const daysAgo = Math.floor((index / demoObservations.length) * 30);
        const observedAt = new Date(now - daysAgo * dayMs);

        return {
          childId: child!.id,
          dimension: obs.dimension,
          content: obs.content,
          sentiment: obs.sentiment,
          observedAt,
          tags: obs.tags,
        };
      });

      await fastify.prisma.observation.createMany({ data: observationData });
    }

    // 4. Seed milestones if none exist
    const milestoneCount = await fastify.prisma.childMilestone.count({
      where: { childId: child.id },
    });

    if (milestoneCount === 0) {
      const definitions = await fastify.prisma.milestoneDefinition.findMany({
        where: { ageBand: 'early_years' },
        take: 15,
      });

      if (definitions.length > 0) {
        const milestoneData = definitions.map((def) => ({
          childId: child!.id,
          milestoneId: def.id,
          achieved: true,
          achievedAt: new Date(),
        }));

        await fastify.prisma.childMilestone.createMany({ data: milestoneData });
      }
    }

    // 5. Issue tokens and return
    const accessToken = await issueTokens(fastify, reply, parent);

    return reply.code(200).send({
      user: parentToResponse(parent),
      accessToken,
    });
  });
};

export default authRoutes;
