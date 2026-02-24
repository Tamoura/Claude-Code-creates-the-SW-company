import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
  getPrisma,
} from './helpers';

let app: FastifyInstance;
let user: TestUser;

beforeAll(async () => {
  app = await getApp();
});

afterAll(async () => {
  await closeApp();
});

beforeEach(async () => {
  await cleanDatabase();
  user = await createTestUser(app, { displayName: 'Test Searcher' });

  const prisma = getPrisma();

  // Create searchable people
  const alice = await createTestUser(app, { displayName: 'Alice Engineer' });
  const bob = await createTestUser(app, { displayName: 'Bob Designer' });
  await prisma.profile.update({
    where: { userId: alice.id },
    data: { headlineEn: 'Senior TypeScript Developer', location: 'Dubai, UAE' },
  });
  await prisma.profile.update({
    where: { userId: bob.id },
    data: { headlineEn: 'UX Designer at Google', location: 'Riyadh, KSA' },
  });

  // Create searchable jobs
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'RECRUITER' },
  });
  // Re-login to get RECRUITER token
  const reLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: user.email, password: 'TestP@ss1' },
  });
  user.accessToken = JSON.parse(reLogin.body).data.accessToken;

  await app.inject({
    method: 'POST',
    url: '/api/v1/jobs',
    headers: authHeaders(user.accessToken),
    payload: {
      title: 'Senior Backend Engineer',
      company: 'TechCorp',
      location: 'Dubai, UAE',
      workType: 'REMOTE',
      experienceLevel: 'SENIOR',
      description: 'Build scalable APIs with TypeScript and Node.js',
      salaryMin: 8000,
      salaryMax: 15000,
      salaryCurrency: 'USD',
    },
  });
  await app.inject({
    method: 'POST',
    url: '/api/v1/jobs',
    headers: authHeaders(user.accessToken),
    payload: {
      title: 'Junior Frontend Developer',
      company: 'DesignHub',
      location: 'Riyadh, KSA',
      workType: 'ONSITE',
      experienceLevel: 'ENTRY',
      description: 'React and CSS development for Arabic-first apps',
      salaryMin: 3000,
      salaryMax: 5000,
      salaryCurrency: 'USD',
    },
  });
});

describe('Advanced Search', () => {
  it('should search people with location filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/advanced?type=people&q=Engineer&location=Dubai',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.results.length).toBeGreaterThanOrEqual(1);
    expect(body.data.results[0].displayName).toContain('Alice');
  });

  it('should search jobs with workType filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/advanced?type=jobs&q=Engineer&workType=REMOTE',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.results.length).toBe(1);
    expect(body.data.results[0].title).toContain('Backend');
  });

  it('should search jobs with experienceLevel filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/advanced?type=jobs&q=Developer&experienceLevel=ENTRY',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.results.length).toBe(1);
    expect(body.data.results[0].title).toContain('Frontend');
  });

  it('should return paginated results', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/advanced?type=jobs&q=e&limit=1',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.results.length).toBe(1);
    expect(body.meta).toBeDefined();
  });

  it('should require a query parameter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/advanced?type=people',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(400);
  });

  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search/advanced?type=people&q=test',
    });
    expect(res.statusCode).toBe(401);
  });
});
