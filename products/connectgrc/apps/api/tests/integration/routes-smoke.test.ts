import { FastifyInstance } from 'fastify';
import { createTestApp, cleanDb, setupTestDb, closeDb, prisma } from '../helpers/build-app';
import { hashPassword } from '../../src/utils/crypto';

describe('Routes Smoke Test', () => {
  let app: FastifyInstance;
  let talentToken: string;
  let adminToken: string;
  let talentUserId: string;
  let adminUserId: string;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await cleanDb();
    app = await createTestApp();

    // Create talent user
    const talentPasswordHash = await hashPassword('Test1234');
    const talentUser = await prisma.user.create({
      data: {
        email: 'talent@example.com',
        passwordHash: talentPasswordHash,
        name: 'Talent User',
        role: 'TALENT',
        emailVerified: true,
      },
    });
    talentUserId = talentUser.id;
    talentToken = app.jwt.sign({
      userId: talentUser.id,
      email: talentUser.email,
      role: talentUser.role,
    });

    // Create admin user
    const adminPasswordHash = await hashPassword('Admin1234');
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: adminPasswordHash,
        name: 'Admin User',
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    adminUserId = adminUser.id;
    adminToken = app.jwt.sign({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    // Create profile for talent
    await prisma.profile.create({
      data: {
        userId: talentUserId,
        experienceLevel: 'MID',
        currentTier: 'DEVELOPING',
      },
    });

    // Seed some questions
    await prisma.question.createMany({
      data: Array.from({ length: 15 }, (_, i) => ({
        domain: 'RISK_MANAGEMENT',
        type: 'MULTIPLE_CHOICE',
        difficulty: 'INTERMEDIATE',
        text: `Test question ${i + 1}`,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
      })),
    });
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('Assessment Routes', () => {
    it('should list assessments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/assessments',
        headers: { authorization: `Bearer ${talentToken}` },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should create assessment', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/assessments',
        headers: { authorization: `Bearer ${talentToken}` },
        payload: { domain: 'RISK_MANAGEMENT' },
      });
      expect(response.statusCode).toBe(201);
    });
  });

  describe('Question Routes', () => {
    it('should list questions (admin only)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/questions',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should reject non-admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/questions',
        headers: { authorization: `Bearer ${talentToken}` },
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe('Job Routes', () => {
    it('should list jobs (public)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs',
      });
      expect(response.statusCode).toBe(200);
    });

    it('should create job (admin only)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          title: 'GRC Analyst',
          company: 'Test Corp',
          description: 'Test job description',
          location: 'Doha',
          domains: ['RISK_MANAGEMENT'],
          level: 'MID',
        },
      });
      expect(response.statusCode).toBe(201);
    });
  });

  describe('Career Routes', () => {
    it('should simulate career path', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/simulate',
        headers: { authorization: `Bearer ${talentToken}` },
        payload: {
          targetRole: 'Senior GRC Manager',
          targetLevel: 'SENIOR',
        },
      });
      expect(response.statusCode).toBe(201);
    });

    it('should list learning paths', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/career/learning-paths',
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Resource Routes', () => {
    beforeEach(async () => {
      await prisma.resource.create({
        data: {
          title: 'Test Resource',
          type: 'ARTICLE',
          url: 'https://example.com/resource',
          domain: 'RISK_MANAGEMENT',
          level: 'MID',
        },
      });
    });

    it('should list resources', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/resources',
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
    });

    it('should bookmark resource', async () => {
      const resources = await prisma.resource.findMany();
      const resourceId = resources[0].id;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/resources/${resourceId}/bookmark`,
        headers: { authorization: `Bearer ${talentToken}` },
      });
      expect(response.statusCode).toBe(201);
    });
  });

  describe('Notification Routes', () => {
    beforeEach(async () => {
      await prisma.notification.create({
        data: {
          userId: talentUserId,
          type: 'SYSTEM',
          title: 'Welcome',
          message: 'Welcome to ConnectGRC',
        },
      });
    });

    it('should list notifications', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { authorization: `Bearer ${talentToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
    });

    it('should get unread count', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/unread-count',
        headers: { authorization: `Bearer ${talentToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.count).toBe(1);
    });
  });

  describe('Admin Routes', () => {
    it('should list users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('should get analytics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/analytics',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.analytics).toBeDefined();
      expect(body.analytics.users).toBeDefined();
    });

    it('should reject non-admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: { authorization: `Bearer ${talentToken}` },
      });
      expect(response.statusCode).toBe(403);
    });
  });
});
