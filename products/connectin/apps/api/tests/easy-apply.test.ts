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
let recruiter: TestUser;
let jobId: string;

beforeAll(async () => {
  app = await getApp();
  await cleanDatabase();
  user = await createTestUser(app);
  recruiter = await createTestUser(app);

  // Make recruiter a RECRUITER
  const db = getPrisma();
  await db.user.update({
    where: { id: recruiter.id },
    data: { role: 'RECRUITER' },
  });

  // Re-login recruiter to get a JWT with updated role
  const reLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: recruiter.email, password: 'TestP@ss1' },
  });
  recruiter.accessToken = JSON.parse(reLoginRes.body).data.accessToken;

  // Create a job
  const jobRes = await app.inject({
    method: 'POST',
    url: '/api/v1/jobs',
    headers: authHeaders(recruiter.accessToken),
    payload: {
      title: 'Software Engineer',
      company: 'TechCorp',
      description: 'Build awesome stuff',
      location: 'Dubai',
      workType: 'REMOTE',
      experienceLevel: 'MID',
    },
  });

  jobId = JSON.parse(jobRes.body).data.id;
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Easy Apply API', () => {
  describe('POST /api/v1/jobs/:id/easy-apply', () => {
    it('should apply to a job with one click', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${jobId}/easy-apply`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.data.jobId).toBe(jobId);
      expect(json.data.status).toBe('PENDING');
    });

    it('should be idempotent (already applied)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${jobId}/easy-apply`,
        headers: authHeaders(user.accessToken),
      });

      // Should return 409 for already applied
      expect(res.statusCode).toBe(409);
    });

    it('should return 404 for non-existent job', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs/00000000-0000-0000-0000-000000000000/easy-apply',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${jobId}/easy-apply`,
      });

      expect(res.statusCode).toBe(401);
    });

    it('should not allow recruiter to apply to own job', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${jobId}/easy-apply`,
        headers: authHeaders(recruiter.accessToken),
      });

      expect(res.statusCode).toBe(422);
    });
  });
});
