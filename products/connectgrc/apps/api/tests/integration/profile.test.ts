import { FastifyInstance } from 'fastify';
import { createTestApp, cleanDb, setupTestDb, closeDb, prisma } from '../helpers/build-app';
import { hashPassword } from '../../src/utils/crypto';

describe('Profile Routes', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await cleanDb();
    app = await createTestApp();

    // Create test user and get token
    const passwordHash = await hashPassword('Test1234');
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash,
        name: 'Test User',
        role: 'TALENT',
        emailVerified: true,
      },
    });
    userId = user.id;

    accessToken = app.jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('GET /profile', () => {
    it('should get current user profile', async () => {
      // Create profile
      await prisma.profile.create({
        data: {
          userId,
          headline: 'GRC Professional',
          bio: 'Experienced in risk management',
          location: 'Doha, Qatar',
          experienceLevel: 'MID',
          currentTier: 'PROFICIENT',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.profile).toMatchObject({
        headline: 'GRC Professional',
        bio: 'Experienced in risk management',
        location: 'Doha, Qatar',
      });
    });

    it('should return null if no profile exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.profile).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /profile', () => {
    it('should create new profile', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          headline: 'Senior GRC Consultant',
          bio: 'Over 10 years experience',
          location: 'Doha, Qatar',
          phone: '+974 5555 5555',
          linkedinUrl: 'https://linkedin.com/in/test',
          experienceLevel: 'SENIOR',
          skills: ['Risk Management', 'Compliance'],
          certifications: ['CRISC', 'CISA'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.profile).toMatchObject({
        headline: 'Senior GRC Consultant',
        experienceLevel: 'SENIOR',
        skills: ['Risk Management', 'Compliance'],
      });

      // Verify in DB
      const profile = await prisma.profile.findUnique({
        where: { userId },
      });
      expect(profile).toBeTruthy();
    });

    it('should update existing profile', async () => {
      // Create initial profile
      await prisma.profile.create({
        data: {
          userId,
          headline: 'Junior Analyst',
          experienceLevel: 'ENTRY',
        },
      });

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          headline: 'Senior Analyst',
          experienceLevel: 'SENIOR',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.profile.headline).toBe('Senior Analyst');
      expect(body.profile.experienceLevel).toBe('SENIOR');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile',
        payload: {
          headline: 'Test',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /profile/:userId', () => {
    it('should get public profile view', async () => {
      await prisma.profile.create({
        data: {
          userId,
          headline: 'GRC Expert',
          bio: 'Public bio',
          location: 'Qatar',
          experienceLevel: 'SENIOR',
          currentTier: 'EXPERT',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/profile/${userId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.profile).toMatchObject({
        headline: 'GRC Expert',
        location: 'Qatar',
      });
      // Phone number should not be exposed
      expect(body.profile.phone).toBeUndefined();
    });

    it('should return 404 if user not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile/nonexistent-id',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if profile not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/profile/${userId}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /profile/domain-scores', () => {
    beforeEach(async () => {
      // Create profile with domain scores
      const profile = await prisma.profile.create({
        data: {
          userId,
          experienceLevel: 'MID',
          currentTier: 'PROFICIENT',
        },
      });

      await prisma.domainScore.createMany({
        data: [
          {
            profileId: profile.id,
            domain: 'RISK_MANAGEMENT',
            score: 85,
            tier: 'PROFICIENT',
          },
          {
            profileId: profile.id,
            domain: 'COMPLIANCE_REGULATORY',
            score: 72,
            tier: 'DEVELOPING',
          },
        ],
      });
    });

    it('should get user domain scores', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile/domain-scores',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.domainScores).toHaveLength(2);
      expect(body.domainScores).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            domain: 'RISK_MANAGEMENT',
            score: 85,
            tier: 'PROFICIENT',
          }),
        ])
      );
    });

    it('should return empty array if no profile', async () => {
      await cleanDb();
      const passwordHash = await hashPassword('Test1234');
      const newUser = await prisma.user.create({
        data: {
          email: 'newuser@example.com',
          passwordHash,
          name: 'New User',
          role: 'TALENT',
          emailVerified: true,
        },
      });

      const newToken = app.jwt.sign({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile/domain-scores',
        headers: {
          authorization: `Bearer ${newToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.domainScores).toEqual([]);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile/domain-scores',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
