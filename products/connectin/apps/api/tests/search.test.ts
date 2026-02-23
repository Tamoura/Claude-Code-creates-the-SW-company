import {
  getApp,
  closeApp,
  cleanDatabase,
  getPrisma,
  authHeaders,
  createTestUser,
} from './helpers';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

async function seedSearchData() {
  const app = await getApp();
  const db = getPrisma();
  const user = await createTestUser(app, { displayName: 'Ahmed Engineer' });

  // Create a second user with profile data
  const user2 = await createTestUser(app, {
    displayName: 'Sara Designer',
    email: 'sara@example.com',
  });
  await db.profile.update({
    where: { userId: user2.id },
    data: { headlineEn: 'UX Designer at Acme' },
  });

  // Create posts
  await app.inject({
    method: 'POST',
    url: '/api/v1/feed/posts',
    headers: authHeaders(user.accessToken),
    payload: { content: 'Excited about TypeScript and React development!' },
  });
  await app.inject({
    method: 'POST',
    url: '/api/v1/feed/posts',
    headers: authHeaders(user2.accessToken),
    payload: { content: 'Looking for design inspiration for my next project' },
  });

  // Create a job (need recruiter role)
  const recruiter = await db.user.create({
    data: {
      email: 'recruiter-search@test.com',
      displayName: 'Recruiter',
      passwordHash: 'hash',
      role: 'RECRUITER',
      profile: { create: { completenessScore: 0 } },
    },
  });
  await db.job.create({
    data: {
      recruiterId: recruiter.id,
      title: 'Senior React Engineer',
      company: 'TechCorp',
      description: 'Build modern web applications with React and TypeScript',
    },
  });
  await db.job.create({
    data: {
      recruiterId: recruiter.id,
      title: 'UX Designer',
      company: 'DesignStudio',
      description: 'Create beautiful user interfaces and experiences',
    },
  });

  return { user, user2 };
}

describe('Search Module', () => {
  describe('GET /api/v1/search', () => {
    it('requires authentication', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=test',
      });
      expect(res.statusCode).toBe(401);
    });

    it('requires query parameter', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search',
        headers: authHeaders(user.accessToken),
      });
      expect(res.statusCode).toBe(400);
    });

    it('requires non-empty query', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=',
        headers: authHeaders(user.accessToken),
      });
      // Fastify schema validation returns 400 for empty q
      expect(res.statusCode).toBeLessThanOrEqual(422);
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('returns unified results for all types', async () => {
      const app = await getApp();
      const { user } = await seedSearchData();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=design',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.people).toBeDefined();
      expect(body.data.posts).toBeDefined();
      expect(body.data.jobs).toBeDefined();
      expect(body.data.query).toBe('design');
    });

    it('filters by type=people', async () => {
      const app = await getApp();
      const { user } = await seedSearchData();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=Sara&type=people',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.people.length).toBeGreaterThanOrEqual(1);
      expect(body.data.people[0].displayName).toContain('Sara');
      // Other types should be empty arrays when filtered
      expect(body.data.posts).toEqual([]);
      expect(body.data.jobs).toEqual([]);
    });

    it('filters by type=posts', async () => {
      const app = await getApp();
      const { user } = await seedSearchData();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=TypeScript&type=posts',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.posts.length).toBeGreaterThanOrEqual(1);
      expect(body.data.people).toEqual([]);
      expect(body.data.jobs).toEqual([]);
    });

    it('filters by type=jobs', async () => {
      const app = await getApp();
      const { user } = await seedSearchData();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=React&type=jobs',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.jobs.length).toBeGreaterThanOrEqual(1);
      expect(body.data.jobs[0].title).toContain('React');
      expect(body.data.people).toEqual([]);
      expect(body.data.posts).toEqual([]);
    });

    it('returns empty results for unmatched query', async () => {
      const app = await getApp();
      const { user } = await seedSearchData();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=xyznonexistent123',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.people).toEqual([]);
      expect(body.data.posts).toEqual([]);
      expect(body.data.jobs).toEqual([]);
    });

    it('does not return deleted posts', async () => {
      const app = await getApp();
      const { user } = await seedSearchData();
      const db = getPrisma();

      // Soft-delete all posts
      await db.post.updateMany({
        data: { isDeleted: true, content: '[deleted]' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=TypeScript&type=posts',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.posts).toEqual([]);
    });

    it('does not return closed jobs', async () => {
      const app = await getApp();
      const { user } = await seedSearchData();
      const db = getPrisma();

      // Close all jobs
      await db.job.updateMany({
        data: { status: 'CLOSED' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=React&type=jobs',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.jobs).toEqual([]);
    });

    it('does not return deleted/suspended users', async () => {
      const app = await getApp();
      const { user, user2 } = await seedSearchData();
      const db = getPrisma();

      // Suspend user2
      await db.user.update({
        where: { id: user2.id },
        data: { status: 'SUSPENDED' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=Sara&type=people',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.people).toEqual([]);
    });

    it('rejects invalid type parameter', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=test&type=invalid',
        headers: authHeaders(user.accessToken),
      });
      // Fastify schema enum validation returns 422
      expect(res.statusCode).toBeLessThanOrEqual(422);
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('people results include profile data', async () => {
      const app = await getApp();
      const { user } = await seedSearchData();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=Sara&type=people',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.people.length).toBeGreaterThanOrEqual(1);
      const sara = body.data.people.find((p: any) =>
        p.displayName.includes('Sara')
      );
      expect(sara.headlineEn).toBe('UX Designer at Acme');
    });

    it('limits results to 20 per type', async () => {
      const app = await getApp();
      const db = getPrisma();
      const user = await createTestUser(app);

      // Create 25 posts matching "test"
      for (let i = 0; i < 25; i++) {
        await db.post.create({
          data: {
            authorId: user.id,
            content: `Test post number ${i} for search`,
          },
        });
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=test&type=posts',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.posts.length).toBeLessThanOrEqual(20);
    });
  });
});
