import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  getPrisma,
} from './helpers';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Profile Module', () => {
  describe('GET /api/v1/profiles/me', () => {
    it('returns own profile', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.userId).toBe(user.id);
      expect(body.data.experiences).toEqual([]);
      expect(body.data.skills).toEqual([]);
      expect(body.data.completenessScore).toBe(0);
    });

    it('rejects unauthenticated request', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/v1/profiles/me', () => {
    it('updates profile fields', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user.accessToken),
        payload: {
          headlineEn: 'Senior Software Engineer',
          headlineAr: 'مهندس برمجيات أول',
          location: 'Riyadh, Saudi Arabia',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.headlineEn).toBe(
        'Senior Software Engineer'
      );
      expect(body.data.location).toBe(
        'Riyadh, Saudi Arabia'
      );
      expect(body.data.completenessScore).toBeGreaterThan(
        0
      );
    });

    it('validates headline length', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user.accessToken),
        payload: {
          headlineEn: 'a'.repeat(221),
        },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('GET /api/v1/profiles/:id', () => {
    it('returns another user profile', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        displayName: 'User One',
        email: 'user1@example.com',
      });
      const user2 = await createTestUser(app, {
        displayName: 'User Two',
        email: 'user2@example.com',
      });

      // Update user2 profile
      await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user2.accessToken),
        payload: {
          headlineEn: 'Product Manager',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${user2.id}`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.headlineEn).toBe(
        'Product Manager'
      );
    });
  });

  describe('POST /api/v1/profiles/me/experience', () => {
    it('adds experience entry', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/me/experience',
        headers: authHeaders(user.accessToken),
        payload: {
          company: 'Fintech Startup',
          title: 'Senior Engineer',
          startDate: '2023-01-01',
          isCurrent: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.company).toBe('Fintech Startup');
      expect(body.data.isCurrent).toBe(true);
    });

    it('validates required fields', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/me/experience',
        headers: authHeaders(user.accessToken),
        payload: {
          company: 'Test',
          // missing title and startDate
        },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('POST /api/v1/profiles/me/skills', () => {
    it('adds skills to profile', async () => {
      const app = await getApp();
      const user = await createTestUser(app);
      const prisma = getPrisma();

      // Create skills first
      const skill1 = await prisma.skill.create({
        data: {
          nameEn: 'TypeScript',
          nameAr: 'تايب سكريبت',
          category: 'Programming',
        },
      });
      const skill2 = await prisma.skill.create({
        data: {
          nameEn: 'React',
          nameAr: 'رياكت',
          category: 'Frontend',
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/me/skills',
        headers: authHeaders(user.accessToken),
        payload: {
          skillIds: [skill1.id, skill2.id],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].nameEn).toBeDefined();
    });
  });

  describe('Deleted user profiles (RISK-004)', () => {
    it('returns 404 for deactivated user profile', async () => {
      const app = await getApp();
      const db = getPrisma();
      const viewer = await createTestUser(app, { email: 'viewer@test.com' });
      const target = await createTestUser(app, { email: 'deactivated@test.com' });

      // Deactivate the target user
      await db.user.update({
        where: { id: target.id },
        data: { status: 'DEACTIVATED' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${target.id}`,
        headers: authHeaders(viewer.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 404 for suspended user profile', async () => {
      const app = await getApp();
      const db = getPrisma();
      const viewer = await createTestUser(app, { email: 'viewer2@test.com' });
      const target = await createTestUser(app, { email: 'suspended@test.com' });

      await db.user.update({
        where: { id: target.id },
        data: { status: 'SUSPENDED' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${target.id}`,
        headers: authHeaders(viewer.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    it('owner can still view their own deactivated profile', async () => {
      const app = await getApp();
      const db = getPrisma();
      const user = await createTestUser(app, { email: 'self-deact@test.com' });

      await db.user.update({
        where: { id: user.id },
        data: { status: 'DEACTIVATED' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${user.id}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('HTML sanitization (RISK-002/006)', () => {
    it('strips HTML tags from profile headline', async () => {
      const app = await getApp();
      const user = await createTestUser(app, { email: 'xss-profile@test.com' });

      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user.accessToken),
        payload: {
          headlineEn: '<script>alert("xss")</script>Senior Developer',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.headlineEn).not.toContain('<script>');
      expect(body.data.headlineEn).toContain('Senior Developer');
    });
  });

  describe('Education CRUD', () => {
    describe('POST /api/v1/profiles/me/education', () => {
      it('rejects unauthenticated request', async () => {
        const app = await getApp();
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/education',
          payload: {
            institution: 'MIT',
            degree: 'BSc Computer Science',
            startYear: 2018,
          },
        });

        expect(res.statusCode).toBe(401);
      });

      it('adds education entry successfully', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/education',
          headers: authHeaders(user.accessToken),
          payload: {
            institution: 'King Saud University',
            degree: 'BSc Computer Science',
            fieldOfStudy: 'Artificial Intelligence',
            description: 'Graduated with honors',
            startYear: 2015,
            endYear: 2019,
          },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body.success).toBe(true);
        expect(body.data.institution).toBe('King Saud University');
        expect(body.data.degree).toBe('BSc Computer Science');
        expect(body.data.fieldOfStudy).toBe('Artificial Intelligence');
        expect(body.data.description).toBe('Graduated with honors');
        expect(body.data.startYear).toBe(2015);
        expect(body.data.endYear).toBe(2019);
      });

      it('validates required fields', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/education',
          headers: authHeaders(user.accessToken),
          payload: {
            // missing institution, degree, startYear
            fieldOfStudy: 'Computer Science',
          },
        });

        expect(res.statusCode).toBe(422);
      });

      it('validates startYear range', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/education',
          headers: authHeaders(user.accessToken),
          payload: {
            institution: 'MIT',
            degree: 'BSc',
            startYear: 1900, // below 1950 minimum
          },
        });

        expect(res.statusCode).toBe(422);
      });
    });

    describe('PUT /api/v1/profiles/me/education/:id', () => {
      it('updates education entry', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        // Create education first
        const createRes = await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/education',
          headers: authHeaders(user.accessToken),
          payload: {
            institution: 'King Saud University',
            degree: 'BSc Computer Science',
            startYear: 2015,
          },
        });

        const created = JSON.parse(createRes.body);
        const educationId = created.data.id;

        const res = await app.inject({
          method: 'PUT',
          url: `/api/v1/profiles/me/education/${educationId}`,
          headers: authHeaders(user.accessToken),
          payload: {
            degree: 'MSc Computer Science',
            endYear: 2021,
          },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.success).toBe(true);
        expect(body.data.degree).toBe('MSc Computer Science');
        expect(body.data.endYear).toBe(2021);
        // institution should remain unchanged
        expect(body.data.institution).toBe('King Saud University');
      });

      it('returns 404 for non-owned entry', async () => {
        const app = await getApp();
        const user1 = await createTestUser(app, {
          email: 'edu-owner@test.com',
        });
        const user2 = await createTestUser(app, {
          email: 'edu-other@test.com',
        });

        // user1 creates education
        const createRes = await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/education',
          headers: authHeaders(user1.accessToken),
          payload: {
            institution: 'Harvard',
            degree: 'MBA',
            startYear: 2020,
          },
        });

        const created = JSON.parse(createRes.body);
        const educationId = created.data.id;

        // user2 tries to update it
        const res = await app.inject({
          method: 'PUT',
          url: `/api/v1/profiles/me/education/${educationId}`,
          headers: authHeaders(user2.accessToken),
          payload: {
            degree: 'PhD',
          },
        });

        expect(res.statusCode).toBe(404);
      });
    });

    describe('DELETE /api/v1/profiles/me/education/:id', () => {
      it('deletes education entry', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        // Create education first
        const createRes = await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/education',
          headers: authHeaders(user.accessToken),
          payload: {
            institution: 'Stanford',
            degree: 'PhD AI',
            startYear: 2019,
          },
        });

        const created = JSON.parse(createRes.body);
        const educationId = created.data.id;

        const res = await app.inject({
          method: 'DELETE',
          url: `/api/v1/profiles/me/education/${educationId}`,
          headers: authHeaders(user.accessToken),
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.success).toBe(true);
      });

      it('returns 404 for non-owned entry', async () => {
        const app = await getApp();
        const user1 = await createTestUser(app, {
          email: 'del-owner@test.com',
        });
        const user2 = await createTestUser(app, {
          email: 'del-other@test.com',
        });

        // user1 creates education
        const createRes = await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/education',
          headers: authHeaders(user1.accessToken),
          payload: {
            institution: 'Oxford',
            degree: 'MA History',
            startYear: 2017,
          },
        });

        const created = JSON.parse(createRes.body);
        const educationId = created.data.id;

        // user2 tries to delete it
        const res = await app.inject({
          method: 'DELETE',
          url: `/api/v1/profiles/me/education/${educationId}`,
          headers: authHeaders(user2.accessToken),
        });

        expect(res.statusCode).toBe(404);
      });
    });

    describe('GET /api/v1/profiles/me (includes education)', () => {
      it('includes education entries in profile response', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        // Add education
        await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/education',
          headers: authHeaders(user.accessToken),
          payload: {
            institution: 'KFUPM',
            degree: 'BSc Engineering',
            startYear: 2014,
            endYear: 2018,
          },
        });

        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/profiles/me',
          headers: authHeaders(user.accessToken),
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.education).toHaveLength(1);
        expect(body.data.education[0].institution).toBe('KFUPM');
        expect(body.data.education[0].degree).toBe('BSc Engineering');
      });
    });
  });
});
