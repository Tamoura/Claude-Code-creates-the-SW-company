import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
} from './helpers';

let app: FastifyInstance;
let recruiter: TestUser;
let user: TestUser;

beforeAll(async () => {
  app = await getApp();
});

afterAll(async () => {
  await closeApp();
});

beforeEach(async () => {
  await cleanDatabase();
  recruiter = await createTestUser(app, { displayName: 'Recruiter' });
  user = await createTestUser(app, { displayName: 'Job Seeker' });

  // Make recruiter
  const prisma = (await import('./helpers')).getPrisma();
  await prisma.user.update({
    where: { id: recruiter.id },
    data: { role: 'RECRUITER' },
  });
  const reLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: recruiter.email, password: 'TestP@ss1' },
  });
  recruiter.accessToken = JSON.parse(reLogin.body).data.accessToken;

  // Create jobs with salary data
  const jobs = [
    { title: 'Backend Engineer', company: 'TechCo', location: 'Dubai, UAE', workType: 'REMOTE', experienceLevel: 'SENIOR', description: 'Backend work', salaryMin: 10000, salaryMax: 18000, salaryCurrency: 'USD' },
    { title: 'Backend Developer', company: 'StartupX', location: 'Dubai, UAE', workType: 'HYBRID', experienceLevel: 'SENIOR', description: 'Backend APIs', salaryMin: 8000, salaryMax: 14000, salaryCurrency: 'USD' },
    { title: 'Frontend Engineer', company: 'DesignCo', location: 'Riyadh, KSA', workType: 'ONSITE', experienceLevel: 'MID', description: 'React work', salaryMin: 5000, salaryMax: 9000, salaryCurrency: 'USD' },
    { title: 'Backend Engineer', company: 'BigCorp', location: 'Riyadh, KSA', workType: 'REMOTE', experienceLevel: 'ENTRY', description: 'Junior backend', salaryMin: 3000, salaryMax: 6000, salaryCurrency: 'USD' },
  ];

  for (const job of jobs) {
    await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: authHeaders(recruiter.accessToken),
      payload: job,
    });
  }
});

describe('Salary Insights', () => {
  it('should return salary ranges by job title keyword', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/salary-insights?title=Backend',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.jobCount).toBeGreaterThanOrEqual(2);
    expect(body.data.avgMin).toBeDefined();
    expect(body.data.avgMax).toBeDefined();
    expect(body.data.currency).toBe('USD');
  });

  it('should filter by location', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/salary-insights?title=Backend&location=Dubai',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.jobCount).toBe(2);
  });

  it('should filter by experience level', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/salary-insights?title=Backend&experienceLevel=SENIOR',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.jobCount).toBe(2);
    // Senior salaries should be higher
    expect(Number(body.data.avgMin)).toBeGreaterThanOrEqual(8000);
  });

  it('should return breakdown by experience level', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/salary-insights?title=Engineer',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.breakdown).toBeDefined();
    expect(Array.isArray(body.data.breakdown)).toBe(true);
  });

  it('should require title parameter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/salary-insights',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(400);
  });

  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/salary-insights?title=Engineer',
    });
    expect(res.statusCode).toBe(401);
  });
});
