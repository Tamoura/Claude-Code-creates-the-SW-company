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

// Helper: elevate a user to RECRUITER role and return fresh token
async function makeRecruiter(
  userId: string,
  email: string,
  app: Awaited<ReturnType<typeof getApp>>
): Promise<string> {
  const db = getPrisma();
  await db.user.update({
    where: { id: userId },
    data: { role: 'RECRUITER' },
  });

  // Re-login to get token with updated role in payload
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password: 'TestP@ss1' },
  });
  const loginBody = JSON.parse(loginRes.body);
  return loginBody.data.accessToken;
}

// Helper: create a recruiter user with fresh token
async function createRecruiter(
  app: Awaited<ReturnType<typeof getApp>>
): Promise<{ id: string; email: string; accessToken: string }> {
  const user = await createTestUser(app);
  const token = await makeRecruiter(user.id, user.email, app);
  return { id: user.id, email: user.email, accessToken: token };
}

// Helper: create a job via API
async function createJob(
  app: Awaited<ReturnType<typeof getApp>>,
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; [key: string]: unknown }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/jobs',
    headers: authHeaders(token),
    payload: {
      title: 'Senior TypeScript Engineer',
      company: 'TechCorp',
      location: 'Riyadh, SA',
      workType: 'HYBRID',
      experienceLevel: 'SENIOR',
      description: 'We are looking for a senior TS engineer.',
      requirements: '5+ years TypeScript experience.',
      salaryMin: 10000,
      salaryMax: 20000,
      salaryCurrency: 'SAR',
      language: 'en',
      ...overrides,
    },
  });
  const body = JSON.parse(res.body);
  return body.data;
}

describe('Salary Decimal (RISK-019)', () => {
  it('creates a job with decimal salary values', async () => {
    const app = await getApp();
    const recruiter = await createRecruiter(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: authHeaders(recruiter.accessToken),
      payload: {
        title: 'Decimal Salary Job',
        company: 'Corp',
        workType: 'REMOTE',
        experienceLevel: 'MID',
        description: 'Test decimal salary.',
        language: 'en',
        salaryMin: 15000.50,
        salaryMax: 25000.75,
        salaryCurrency: 'SAR',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.salaryMin).toBe(15000.50);
    expect(body.data.salaryMax).toBe(25000.75);
  });

  it('returns salary as number (not Decimal object)', async () => {
    const app = await getApp();
    const recruiter = await createRecruiter(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: authHeaders(recruiter.accessToken),
      payload: {
        title: 'Number Type Salary',
        company: 'Corp',
        workType: 'ONSITE',
        experienceLevel: 'SENIOR',
        description: 'Verify number return type.',
        language: 'en',
        salaryMin: 10000,
        salaryMax: 20000,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(typeof body.data.salaryMin).toBe('number');
    expect(typeof body.data.salaryMax).toBe('number');
  });

  it('handles null salary fields', async () => {
    const app = await getApp();
    const recruiter = await createRecruiter(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: authHeaders(recruiter.accessToken),
      payload: {
        title: 'No Salary Job',
        company: 'Corp',
        workType: 'HYBRID',
        experienceLevel: 'ENTRY',
        description: 'No salary specified.',
        language: 'en',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.salaryMin).toBeNull();
    expect(body.data.salaryMax).toBeNull();
  });

  it('returns decimal salary through GET endpoint', async () => {
    const app = await getApp();
    const recruiter = await createRecruiter(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: authHeaders(recruiter.accessToken),
      payload: {
        title: 'GET Decimal Salary',
        company: 'Corp',
        workType: 'REMOTE',
        experienceLevel: 'MID',
        description: 'Get endpoint decimal test.',
        language: 'en',
        salaryMin: 12500.25,
        salaryMax: 18750.50,
      },
    });

    const jobId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/jobs/${jobId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(typeof body.data.salaryMin).toBe('number');
    expect(typeof body.data.salaryMax).toBe('number');
  });
});

describe('Jobs Module', () => {
  // ─── T031: Job CRUD ────────────────────────────────────────────────

  describe('POST /api/v1/jobs', () => {
    it('creates a job listing (recruiter only)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs',
        headers: authHeaders(recruiter.accessToken),
        payload: {
          title: 'Backend Engineer',
          company: 'AcmeCorp',
          location: 'Dubai, UAE',
          workType: 'REMOTE',
          experienceLevel: 'MID',
          description: 'Build scalable APIs.',
          language: 'en',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Backend Engineer');
      expect(body.data.company).toBe('AcmeCorp');
      expect(body.data.workType).toBe('REMOTE');
      expect(body.data.status).toBe('OPEN');
      expect(body.data.recruiterId).toBe(recruiter.id);
    });

    it('rejects non-recruiter users (403)', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs',
        headers: authHeaders(user.accessToken),
        payload: {
          title: 'Some Job',
          company: 'Corp',
          workType: 'ONSITE',
          experienceLevel: 'MID',
          description: 'Some description.',
          language: 'en',
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('requires authentication (401)', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs',
        payload: {
          title: 'Some Job',
          company: 'Corp',
          description: 'Desc',
          language: 'en',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('validates required fields', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs',
        headers: authHeaders(recruiter.accessToken),
        payload: { title: 'No company or description' },
      });

      expect(res.statusCode).toBe(422);
    });

    it('validates salary range (min <= max)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs',
        headers: authHeaders(recruiter.accessToken),
        payload: {
          title: 'Bad Salary Job',
          company: 'Corp',
          workType: 'REMOTE',
          experienceLevel: 'MID',
          description: 'Desc',
          language: 'en',
          salaryMin: 50000,
          salaryMax: 10000,
        },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('GET /api/v1/jobs', () => {
    it('lists open jobs (public)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      await createJob(app, recruiter.accessToken, {
        title: 'Job A',
        workType: 'ONSITE',
      });
      await createJob(app, recruiter.accessToken, {
        title: 'Job B',
        workType: 'REMOTE',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(body.meta).toBeDefined();
    });

    it('filters by workType', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      await createJob(app, recruiter.accessToken, {
        title: 'Remote Job',
        workType: 'REMOTE',
      });
      await createJob(app, recruiter.accessToken, {
        title: 'Onsite Job',
        workType: 'ONSITE',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs?workType=REMOTE',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(
        body.data.every((j: { workType: string }) => j.workType === 'REMOTE')
      ).toBe(true);
    });

    it('filters by experienceLevel', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      await createJob(app, recruiter.accessToken, {
        title: 'Senior Job',
        experienceLevel: 'SENIOR',
      });
      await createJob(app, recruiter.accessToken, {
        title: 'Entry Job',
        experienceLevel: 'ENTRY',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs?experienceLevel=SENIOR',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(
        body.data.every(
          (j: { experienceLevel: string }) => j.experienceLevel === 'SENIOR'
        )
      ).toBe(true);
    });

    it('filters by keyword (q) in title/company/description', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      await createJob(app, recruiter.accessToken, {
        title: 'Golang Backend Developer',
        company: 'StartupXYZ',
        description: 'Build microservices in Go.',
      });
      await createJob(app, recruiter.accessToken, {
        title: 'Frontend React Developer',
        company: 'AnotherCorp',
        description: 'React expert needed.',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs?q=Golang',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toContain('Golang');
    });

    it('filters by location (partial match)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      await createJob(app, recruiter.accessToken, {
        title: 'Riyadh Job',
        location: 'Riyadh, Saudi Arabia',
      });
      await createJob(app, recruiter.accessToken, {
        title: 'Dubai Job',
        location: 'Dubai, UAE',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs?location=Riyadh',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Riyadh Job');
    });

    it('supports cursor-based pagination', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      for (let i = 0; i < 5; i++) {
        await createJob(app, recruiter.accessToken, {
          title: `Job ${i + 1}`,
        });
      }

      const page1 = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs?limit=3',
      });

      const page1Body = JSON.parse(page1.body);
      expect(page1Body.data).toHaveLength(3);
      expect(page1Body.meta.hasMore).toBe(true);
      expect(page1Body.meta.cursor).toBeDefined();

      const page2 = await app.inject({
        method: 'GET',
        url: `/api/v1/jobs?limit=3&cursor=${page1Body.meta.cursor}`,
      });

      const page2Body = JSON.parse(page2.body);
      expect(page2Body.data).toHaveLength(2);
      expect(page2Body.meta.hasMore).toBe(false);
    });

    it('only returns OPEN jobs by default', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'To Be Archived',
      });

      // Archive the job
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/jobs/${job.id}`,
        headers: authHeaders(recruiter.accessToken),
      });

      await createJob(app, recruiter.accessToken, {
        title: 'Still Open',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(
        body.data.every((j: { status: string }) => j.status === 'OPEN')
      ).toBe(true);
    });
  });

  describe('GET /api/v1/jobs/:id', () => {
    it('returns job detail', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Detailed Job',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/jobs/${job.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBe(job.id);
      expect(body.data.title).toBe('Detailed Job');
    });

    it('returns 404 for non-existent job', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs/00000000-0000-0000-0000-000000000000',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/jobs/:id', () => {
    it('updates job (owner recruiter only)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Original Title',
      });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/jobs/${job.id}`,
        headers: authHeaders(recruiter.accessToken),
        payload: { title: 'Updated Title' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.title).toBe('Updated Title');
    });

    it('rejects update from non-owner recruiter (403)', async () => {
      const app = await getApp();
      const recruiter1 = await createRecruiter(app);
      const recruiter2 = await createRecruiter(app);

      const job = await createJob(app, recruiter1.accessToken, {
        title: 'Owner Job',
      });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/jobs/${job.id}`,
        headers: authHeaders(recruiter2.accessToken),
        payload: { title: 'Stolen Update' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('rejects update from regular user (403)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const user = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'A Job',
      });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/jobs/${job.id}`,
        headers: authHeaders(user.accessToken),
        payload: { title: 'Hacked' },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/jobs/:id', () => {
    it('archives job (owner only)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'To Archive',
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/jobs/${job.id}`,
        headers: authHeaders(recruiter.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe('ARCHIVED');
    });

    it('rejects archive from non-owner (403)', async () => {
      const app = await getApp();
      const recruiter1 = await createRecruiter(app);
      const recruiter2 = await createRecruiter(app);

      const job = await createJob(app, recruiter1.accessToken, {
        title: 'Owned Job',
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/jobs/${job.id}`,
        headers: authHeaders(recruiter2.accessToken),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── T033: Save/Bookmark Jobs ──────────────────────────────────────

  describe('POST /api/v1/jobs/:id/save', () => {
    it('saves a job for authenticated user', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const user = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Save Me',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/save`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.saved).toBe(true);
    });

    it('is idempotent (saving twice is ok)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const user = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Double Save',
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/save`,
        headers: authHeaders(user.accessToken),
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/save`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.saved).toBe(true);
    });

    it('requires authentication (401)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Auth Required',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/save`,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/jobs/:id/save', () => {
    it('unsaves a job', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const user = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Unsave Me',
      });

      // Save first
      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/save`,
        headers: authHeaders(user.accessToken),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/jobs/${job.id}/save`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.saved).toBe(false);
    });
  });

  describe('GET /api/v1/jobs/saved', () => {
    it('returns saved jobs for authenticated user', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const user = await createTestUser(app);

      const job1 = await createJob(app, recruiter.accessToken, {
        title: 'Saved Job 1',
      });
      const job2 = await createJob(app, recruiter.accessToken, {
        title: 'Saved Job 2',
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job1.id}/save`,
        headers: authHeaders(user.accessToken),
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job2.id}/save`,
        headers: authHeaders(user.accessToken),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs/saved',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
    });

    it('requires authentication (401)', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs/saved',
      });

      expect(res.statusCode).toBe(401);
    });

    it('only returns current user saved jobs', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Shared Job',
      });

      // user1 saves it
      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/save`,
        headers: authHeaders(user1.accessToken),
      });

      // user2 checks saved jobs
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs/saved',
        headers: authHeaders(user2.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(0);
    });
  });

  // ─── T034: Apply to Jobs ───────────────────────────────────────────

  describe('POST /api/v1/jobs/:id/apply', () => {
    it('applies to a job with optional cover note', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const applicant = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Apply Here',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        headers: authHeaders(applicant.accessToken),
        payload: {
          coverNote: 'I am very interested in this position.',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.jobId).toBe(job.id);
      expect(body.data.applicantId).toBe(applicant.id);
      expect(body.data.status).toBe('PENDING');
      expect(body.data.coverNote).toBe(
        'I am very interested in this position.'
      );
    });

    it('applies to a job without a cover note', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const applicant = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'No Cover Note',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        headers: authHeaders(applicant.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.coverNote).toBeNull();
    });

    it('prevents duplicate applications (FR-505)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const applicant = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'No Double Apply',
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        headers: authHeaders(applicant.accessToken),
        payload: {},
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        headers: authHeaders(applicant.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(409);
    });

    it('validates cover note max 500 chars (FR-504)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const applicant = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Cover Note Limit',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        headers: authHeaders(applicant.accessToken),
        payload: { coverNote: 'x'.repeat(501) },
      });

      expect(res.statusCode).toBe(422);
    });

    it('requires authentication (401)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Auth Required',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        payload: {},
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 404 for non-existent job', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs/00000000-0000-0000-0000-000000000000/apply',
        headers: authHeaders(user.accessToken),
        payload: {},
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── T035: Application Management ──────────────────────────────────

  describe('GET /api/v1/jobs/:id/applications', () => {
    it('lists applicants for job owner (recruiter)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const applicant1 = await createTestUser(app);
      const applicant2 = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'View My Applicants',
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        headers: authHeaders(applicant1.accessToken),
        payload: { coverNote: 'First applicant' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        headers: authHeaders(applicant2.accessToken),
        payload: {},
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/jobs/${job.id}/applications`,
        headers: authHeaders(recruiter.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
    });

    it('rejects non-owner access (403)', async () => {
      const app = await getApp();
      const recruiter1 = await createRecruiter(app);
      const recruiter2 = await createRecruiter(app);

      const job = await createJob(app, recruiter1.accessToken, {
        title: 'Private Applicants',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/jobs/${job.id}/applications`,
        headers: authHeaders(recruiter2.accessToken),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/jobs/:jobId/applications/:appId', () => {
    it('withdraws own application', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const applicant = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Withdraw Application',
      });

      const applyRes = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        headers: authHeaders(applicant.accessToken),
        payload: {},
      });
      const appId = JSON.parse(applyRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/jobs/${job.id}/applications/${appId}`,
        headers: authHeaders(applicant.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe('WITHDRAWN');
    });

    it('rejects withdrawal by non-applicant (403)', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const applicant = await createTestUser(app);
      const other = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Someone Elses Application',
      });

      const applyRes = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        headers: authHeaders(applicant.accessToken),
        payload: {},
      });
      const appId = JSON.parse(applyRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/jobs/${job.id}/applications/${appId}`,
        headers: authHeaders(other.accessToken),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── My Applications ─────────────────────────────────────────────

  describe('GET /api/v1/jobs/my-applications', () => {
    it('requires authentication (401)', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs/my-applications',
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns empty array when user has no applications', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs/my-applications',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(0);
      expect(body.meta.hasMore).toBe(false);
    });

    it('returns applied jobs with details', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const applicant = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'My Applied Job',
        company: 'TestCorp',
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        headers: authHeaders(applicant.accessToken),
        payload: { coverNote: 'Eager to join' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs/my-applications',
        headers: authHeaders(applicant.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe('PENDING');
      expect(body.data[0].coverNote).toBe('Eager to join');
      expect(body.data[0].job).toBeDefined();
      expect(body.data[0].job.title).toBe('My Applied Job');
      expect(body.data[0].job.company).toBe('TestCorp');
      expect(body.data[0].appliedAt).toBeDefined();
    });

    it('only returns current user applications', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      const job = await createJob(app, recruiter.accessToken, {
        title: 'Shared Job',
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job.id}/apply`,
        headers: authHeaders(user1.accessToken),
        payload: {},
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs/my-applications',
        headers: authHeaders(user2.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(0);
    });

    it('supports cursor-based pagination', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const applicant = await createTestUser(app);

      for (let i = 0; i < 5; i++) {
        const job = await createJob(app, recruiter.accessToken, {
          title: `Paginated Job ${i + 1}`,
        });
        await app.inject({
          method: 'POST',
          url: `/api/v1/jobs/${job.id}/apply`,
          headers: authHeaders(applicant.accessToken),
          payload: {},
        });
      }

      const page1 = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs/my-applications?limit=3',
        headers: authHeaders(applicant.accessToken),
      });

      const page1Body = JSON.parse(page1.body);
      expect(page1Body.data).toHaveLength(3);
      expect(page1Body.meta.hasMore).toBe(true);
      expect(page1Body.meta.cursor).toBeDefined();

      const page2 = await app.inject({
        method: 'GET',
        url: `/api/v1/jobs/my-applications?limit=3&cursor=${page1Body.meta.cursor}`,
        headers: authHeaders(applicant.accessToken),
      });

      const page2Body = JSON.parse(page2.body);
      expect(page2Body.data).toHaveLength(2);
      expect(page2Body.meta.hasMore).toBe(false);
    });

    it('orders by most recent first', async () => {
      const app = await getApp();
      const recruiter = await createRecruiter(app);
      const applicant = await createTestUser(app);

      const job1 = await createJob(app, recruiter.accessToken, {
        title: 'First Applied',
      });
      const job2 = await createJob(app, recruiter.accessToken, {
        title: 'Second Applied',
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job1.id}/apply`,
        headers: authHeaders(applicant.accessToken),
        payload: {},
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${job2.id}/apply`,
        headers: authHeaders(applicant.accessToken),
        payload: {},
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/jobs/my-applications',
        headers: authHeaders(applicant.accessToken),
      });

      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].job.title).toBe('Second Applied');
      expect(body.data[1].job.title).toBe('First Applied');
    });
  });

  describe('HTML sanitization (RISK-002)', () => {
    it('strips HTML tags from job title and description', async () => {
      const app = await getApp();
      const recruiter = await createTestUser(app, {
        email: 'xss-recruiter@test.com',
      });
      const token = await makeRecruiter(
        recruiter.id,
        'xss-recruiter@test.com',
        app
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs',
        headers: authHeaders(token),
        payload: {
          title: '<script>alert("xss")</script>Engineer',
          company: '<img onerror=alert(1) src=x>Acme',
          description: '<b>Bold</b> and <script>evil</script>good',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.title).not.toContain('<script>');
      expect(body.data.title).toContain('Engineer');
      expect(body.data.company).not.toContain('<img');
      expect(body.data.company).toContain('Acme');
      expect(body.data.description).not.toContain('<script>');
    });

    it('strips HTML from cover note on job application', async () => {
      const app = await getApp();
      const recruiter = await createTestUser(app, {
        email: 'xss-rec2@test.com',
      });
      const token = await makeRecruiter(
        recruiter.id,
        'xss-rec2@test.com',
        app
      );
      const applicant = await createTestUser(app, {
        email: 'xss-applicant@test.com',
      });

      const jobRes = await app.inject({
        method: 'POST',
        url: '/api/v1/jobs',
        headers: authHeaders(token),
        payload: {
          title: 'Engineer',
          company: 'Acme',
          description: 'Build things',
        },
      });
      const jobId = JSON.parse(jobRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${jobId}/apply`,
        headers: authHeaders(applicant.accessToken),
        payload: {
          coverNote: '<script>steal()</script>I am qualified',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.coverNote).not.toContain('<script>');
      expect(body.data.coverNote).toContain('I am qualified');
    });
  });
});
