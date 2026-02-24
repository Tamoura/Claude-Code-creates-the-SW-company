import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../src/app';

let app: FastifyInstance | null = null;
let prisma: PrismaClient | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildApp({ skipRateLimit: true });
    await app.ready();
  }
  return app;
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export async function cleanDatabase(): Promise<void> {
  const db = getPrisma();
  // Delete in correct order to respect foreign keys
  await db.article.deleteMany();
  await db.eventAttendee.deleteMany();
  await db.event.deleteMany();
  await db.groupPost.deleteMany();
  await db.groupMember.deleteMany();
  await db.group.deleteMany();
  await db.orgFollower.deleteMany();
  await db.orgMember.deleteMany();
  await db.jobAlert.deleteMany();
  await db.recommendation.deleteMany();
  await db.pollVote.deleteMany();
  await db.pollOption.deleteMany();
  await db.poll.deleteMany();
  await db.postView.deleteMany();
  await db.profileView.deleteMany();
  await db.bookmark.deleteMany();
  await db.message.deleteMany();
  await db.conversationMember.deleteMany();
  await db.conversation.deleteMany();
  await db.postMedia.deleteMany();
  await db.media.deleteMany();
  await db.mention.deleteMany();
  await db.postHashtag.deleteMany();
  await db.hashtagFollow.deleteMany();
  await db.repost.deleteMany();
  await db.hashtag.deleteMany();
  await db.endorsement.deleteMany();
  await db.reaction.deleteMany();
  await db.report.deleteMany();
  await db.follow.deleteMany();
  await db.block.deleteMany();
  await db.notification.deleteMany();
  await db.notificationPreference.deleteMany();
  await db.like.deleteMany();
  await db.comment.deleteMany();
  await db.post.deleteMany();
  await db.connection.deleteMany();
  await db.profileSkill.deleteMany();
  await db.skill.deleteMany();
  await db.certification.deleteMany();
  await db.education.deleteMany();
  await db.experience.deleteMany();
  await db.processingObjection.deleteMany();
  await db.consent.deleteMany();
  await db.session.deleteMany();
  await db.savedJob.deleteMany();
  await db.jobApplication.deleteMany();
  await db.job.deleteMany();
  await db.organization.deleteMany();
  await db.userPreference.deleteMany();
  await db.profile.deleteMany();
  await db.user.deleteMany();
}

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

let userCounter = 0;

export async function createTestUser(
  appInstance?: FastifyInstance,
  overrides?: { displayName?: string; email?: string }
): Promise<TestUser> {
  const testApp = appInstance || (await getApp());
  userCounter++;
  const email =
    overrides?.email ||
    `testuser${userCounter}@example.com`;
  const password = 'TestP@ss1';
  const displayName =
    overrides?.displayName ||
    `Test User ${userCounter}`;

  // Register
  await testApp.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password, displayName },
  });

  // Login to get token
  const loginRes = await testApp.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });

  const loginBody = JSON.parse(loginRes.body);
  return {
    id: loginBody.data.user.id,
    email,
    accessToken: loginBody.data.accessToken,
  };
}

export function authHeaders(
  token: string
): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
