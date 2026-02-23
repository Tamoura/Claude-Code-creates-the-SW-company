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

  describe('Experience Update & Delete', () => {
    /** Helper: create a user and add an experience entry, returning both. */
    async function createUserWithExperience(
      emailOverride?: string
    ) {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: emailOverride || 'exp-user@test.com',
      });

      const addRes = await app.inject({
        method: 'POST',
        url: '/api/v1/profiles/me/experience',
        headers: authHeaders(user.accessToken),
        payload: {
          company: 'Acme Corp',
          title: 'Engineer',
          startDate: '2023-01-01',
          isCurrent: true,
        },
      });

      const experience = JSON.parse(addRes.body).data;
      return { app, user, experience };
    }

    // --- PUT /api/v1/profiles/me/experience/:id ---

    it('PUT /experience/:id - rejects unauthenticated request', async () => {
      const { app, experience } = await createUserWithExperience(
        'put-auth@test.com'
      );

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/profiles/me/experience/${experience.id}`,
        payload: { title: 'Senior Engineer' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('PUT /experience/:id - updates experience entry', async () => {
      const { app, user, experience } =
        await createUserWithExperience('put-ok@test.com');

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/profiles/me/experience/${experience.id}`,
        headers: authHeaders(user.accessToken),
        payload: {
          title: 'Senior Engineer',
          company: 'New Corp',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Senior Engineer');
      expect(body.data.company).toBe('New Corp');
      // unchanged fields preserved
      expect(body.data.isCurrent).toBe(true);
    });

    it('PUT /experience/:id - returns 404 for non-owned entry', async () => {
      const { app, experience } =
        await createUserWithExperience('put-owner@test.com');

      // Create a second user who does NOT own the experience
      const otherUser = await createTestUser(app, {
        email: 'put-other@test.com',
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/profiles/me/experience/${experience.id}`,
        headers: authHeaders(otherUser.accessToken),
        payload: { title: 'Hacker' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('PUT /experience/:id - returns 422 for invalid date', async () => {
      const { app, user, experience } =
        await createUserWithExperience('put-val@test.com');

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/profiles/me/experience/${experience.id}`,
        headers: authHeaders(user.accessToken),
        payload: { startDate: 'not-a-date' },
      });

      expect(res.statusCode).toBe(422);
    });

    // --- DELETE /api/v1/profiles/me/experience/:id ---

    it('DELETE /experience/:id - rejects unauthenticated request', async () => {
      const { app, experience } = await createUserWithExperience(
        'del-auth@test.com'
      );

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/profiles/me/experience/${experience.id}`,
      });

      expect(res.statusCode).toBe(401);
    });

    it('DELETE /experience/:id - deletes experience entry', async () => {
      const { app, user, experience } =
        await createUserWithExperience('del-ok@test.com');

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/profiles/me/experience/${experience.id}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // Verify the experience is gone from the profile
      const profileRes = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user.accessToken),
      });
      const profileBody = JSON.parse(profileRes.body);
      expect(profileBody.data.experiences).toHaveLength(0);
    });

    it('DELETE /experience/:id - returns 404 for non-owned entry', async () => {
      const { app, experience } =
        await createUserWithExperience('del-owner@test.com');

      const otherUser = await createTestUser(app, {
        email: 'del-other@test.com',
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/profiles/me/experience/${experience.id}`,
        headers: authHeaders(otherUser.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    it('DELETE /experience/:id - recalculates completeness score', async () => {
      const { app, user, experience } =
        await createUserWithExperience('del-score@test.com');

      // Verify score includes experience points before delete
      const beforeRes = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user.accessToken),
      });
      const scoreBefore = JSON.parse(beforeRes.body).data
        .completenessScore;
      expect(scoreBefore).toBeGreaterThan(0);

      // Delete the experience
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/profiles/me/experience/${experience.id}`,
        headers: authHeaders(user.accessToken),
      });

      // Verify score dropped after deleting experience
      const afterRes = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user.accessToken),
      });
      const scoreAfter = JSON.parse(afterRes.body).data
        .completenessScore;
      expect(scoreAfter).toBeLessThan(scoreBefore);
    });
  });
});
