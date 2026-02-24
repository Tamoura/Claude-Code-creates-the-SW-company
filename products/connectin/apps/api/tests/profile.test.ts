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

  describe('Profile Strength Meter', () => {
    describe('GET /api/v1/profiles/me/strength', () => {
      it('returns 0 score for empty profile', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/profiles/me/strength',
          headers: authHeaders(user.accessToken),
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.success).toBe(true);
        expect(body.data.score).toBe(0);
        expect(body.data.maxScore).toBe(100);
        expect(body.data.suggestions).toBeDefined();
        expect(Array.isArray(body.data.suggestions)).toBe(true);
        expect(body.data.suggestions.length).toBeGreaterThan(0);
      });

      it('increases score when profile has photo', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        await app.inject({
          method: 'PUT',
          url: '/api/v1/profiles/me',
          headers: authHeaders(user.accessToken),
          payload: { avatarUrl: 'https://example.com/photo.jpg' },
        });

        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/profiles/me/strength',
          headers: authHeaders(user.accessToken),
        });

        const body = JSON.parse(res.body);
        expect(body.data.score).toBe(15);
      });

      it('returns 100 for fully complete profile', async () => {
        const app = await getApp();
        const db = getPrisma();
        const user = await createTestUser(app);

        // Fill all profile fields
        await app.inject({
          method: 'PUT',
          url: '/api/v1/profiles/me',
          headers: authHeaders(user.accessToken),
          payload: {
            avatarUrl: 'https://example.com/photo.jpg',
            headlineEn: 'Software Engineer',
            headlineAr: 'مهندس برمجيات',
            summaryEn: 'Experienced developer',
            summaryAr: 'مطور ذو خبرة',
            location: 'Riyadh',
            website: 'https://example.com',
          },
        });

        // Add experience
        await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/experience',
          headers: authHeaders(user.accessToken),
          payload: {
            company: 'Tech Co',
            title: 'Engineer',
            startDate: '2020-01-01',
            isCurrent: true,
          },
        });

        // Add education
        await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/education',
          headers: authHeaders(user.accessToken),
          payload: {
            institution: 'KSU',
            degree: 'BSc CS',
            startYear: 2015,
          },
        });

        // Add skills
        const skill = await db.skill.create({
          data: { nameEn: 'TypeScript', category: 'Programming' },
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/profiles/me/skills',
          headers: authHeaders(user.accessToken),
          payload: { skillIds: [skill.id] },
        });

        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/profiles/me/strength',
          headers: authHeaders(user.accessToken),
        });

        const body = JSON.parse(res.body);
        expect(body.data.score).toBe(100);
        expect(body.data.suggestions).toHaveLength(0);
      });

      it('returns bilingual suggestions', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/profiles/me/strength',
          headers: authHeaders(user.accessToken),
        });

        const body = JSON.parse(res.body);
        // Each suggestion should have both en and ar text
        for (const suggestion of body.data.suggestions) {
          expect(suggestion.en).toBeDefined();
          expect(suggestion.ar).toBeDefined();
          expect(suggestion.field).toBeDefined();
          expect(suggestion.weight).toBeDefined();
        }
      });

      it('rejects unauthenticated request', async () => {
        const app = await getApp();
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/profiles/me/strength',
        });

        expect(res.statusCode).toBe(401);
      });
    });
  });

  describe('Open-to-Work Badge', () => {
    describe('PUT /api/v1/profiles/me/open-to-work', () => {
      it('enables open-to-work', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        const res = await app.inject({
          method: 'PUT',
          url: '/api/v1/profiles/me/open-to-work',
          headers: authHeaders(user.accessToken),
          payload: {
            openToWork: true,
            visibility: 'PUBLIC',
          },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.openToWork).toBe(true);
        expect(body.data.visibility).toBe('PUBLIC');
      });

      it('disables open-to-work', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        // Enable first
        await app.inject({
          method: 'PUT',
          url: '/api/v1/profiles/me/open-to-work',
          headers: authHeaders(user.accessToken),
          payload: { openToWork: true, visibility: 'PUBLIC' },
        });

        // Disable
        const res = await app.inject({
          method: 'PUT',
          url: '/api/v1/profiles/me/open-to-work',
          headers: authHeaders(user.accessToken),
          payload: { openToWork: false },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.openToWork).toBe(false);
      });

      it('defaults to RECRUITERS_ONLY visibility', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        const res = await app.inject({
          method: 'PUT',
          url: '/api/v1/profiles/me/open-to-work',
          headers: authHeaders(user.accessToken),
          payload: { openToWork: true },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.visibility).toBe('RECRUITERS_ONLY');
      });

      it('includes open-to-work in profile response', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        // Enable open-to-work
        await app.inject({
          method: 'PUT',
          url: '/api/v1/profiles/me/open-to-work',
          headers: authHeaders(user.accessToken),
          payload: { openToWork: true, visibility: 'PUBLIC' },
        });

        // Check profile includes it
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/profiles/me',
          headers: authHeaders(user.accessToken),
        });

        const body = JSON.parse(res.body);
        expect(body.data.openToWork).toBe(true);
        expect(body.data.openToWorkVisibility).toBe('PUBLIC');
      });

      it('hides open-to-work from non-recruiters when RECRUITERS_ONLY', async () => {
        const app = await getApp();
        const owner = await createTestUser(app, { email: 'otw-owner@test.com' });
        const viewer = await createTestUser(app, { email: 'otw-viewer@test.com' });

        // Enable with RECRUITERS_ONLY
        await app.inject({
          method: 'PUT',
          url: '/api/v1/profiles/me/open-to-work',
          headers: authHeaders(owner.accessToken),
          payload: { openToWork: true, visibility: 'RECRUITERS_ONLY' },
        });

        // Non-recruiter views profile - should NOT see open-to-work
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/profiles/${owner.id}`,
          headers: authHeaders(viewer.accessToken),
        });

        const body = JSON.parse(res.body);
        expect(body.data.openToWork).toBeUndefined();
      });

      it('shows open-to-work to all when PUBLIC', async () => {
        const app = await getApp();
        const owner = await createTestUser(app, { email: 'otw-pub-owner@test.com' });
        const viewer = await createTestUser(app, { email: 'otw-pub-viewer@test.com' });

        // Enable with PUBLIC
        await app.inject({
          method: 'PUT',
          url: '/api/v1/profiles/me/open-to-work',
          headers: authHeaders(owner.accessToken),
          payload: { openToWork: true, visibility: 'PUBLIC' },
        });

        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/profiles/${owner.id}`,
          headers: authHeaders(viewer.accessToken),
        });

        const body = JSON.parse(res.body);
        expect(body.data.openToWork).toBe(true);
      });

      it('rejects unauthenticated request', async () => {
        const app = await getApp();
        const res = await app.inject({
          method: 'PUT',
          url: '/api/v1/profiles/me/open-to-work',
          payload: { openToWork: true },
        });

        expect(res.statusCode).toBe(401);
      });
    });
  });
});
