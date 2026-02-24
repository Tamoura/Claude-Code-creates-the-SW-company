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
let user: TestUser;

beforeAll(async () => {
  app = await getApp();
});

afterAll(async () => {
  await closeApp();
});

beforeEach(async () => {
  await cleanDatabase();
  user = await createTestUser(app);
});

describe('Job Alerts', () => {
  const validAlert = {
    keywords: 'Senior Engineer TypeScript',
    location: 'Dubai, UAE',
    workType: 'REMOTE',
    experienceLevel: 'SENIOR',
  };

  it('should create a job alert', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/job-alerts',
      headers: authHeaders(user.accessToken),
      payload: validAlert,
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.keywords).toBe(validAlert.keywords);
    expect(body.data.isActive).toBe(true);
  });

  it('should list job alerts for current user', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/job-alerts',
      headers: authHeaders(user.accessToken),
      payload: validAlert,
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/job-alerts',
      headers: authHeaders(user.accessToken),
      payload: { keywords: 'Frontend React' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/job-alerts',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.length).toBe(2);
  });

  it('should toggle a job alert active/inactive', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/job-alerts',
      headers: authHeaders(user.accessToken),
      payload: validAlert,
    });
    const alertId = JSON.parse(createRes.body).data.id;

    // Deactivate
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/job-alerts/${alertId}`,
      headers: authHeaders(user.accessToken),
      payload: { isActive: false },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.isActive).toBe(false);
  });

  it('should delete a job alert', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/job-alerts',
      headers: authHeaders(user.accessToken),
      payload: validAlert,
    });
    const alertId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/job-alerts/${alertId}`,
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/job-alerts',
      headers: authHeaders(user.accessToken),
    });
    expect(JSON.parse(listRes.body).data.length).toBe(0);
  });

  it('should not allow managing another user\'s alerts', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/job-alerts',
      headers: authHeaders(user.accessToken),
      payload: validAlert,
    });
    const alertId = JSON.parse(createRes.body).data.id;

    const other = await createTestUser(app);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/job-alerts/${alertId}`,
      headers: authHeaders(other.accessToken),
    });
    expect(res.statusCode).toBe(403);
  });

  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/job-alerts',
    });
    expect(res.statusCode).toBe(401);
  });
});
