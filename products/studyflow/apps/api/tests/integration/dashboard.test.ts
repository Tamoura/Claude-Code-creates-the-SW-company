import { FastifyInstance } from 'fastify';
import { buildTestApp, signupStudent, AuthedStudent } from '../helpers/app';
import { resetDatabase, closeTestDb, seedSubject } from '../helpers/db';

function isoInDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function setupGoal(
  app: FastifyInstance,
  cookie: string,
  opts: { code: string; target: number; dueDate: string }
): Promise<{ selectionId: string; goalId: string }> {
  const subj = await seedSubject({ code: opts.code, name: `Subj ${opts.code}` });
  const sel = await app.inject({ method: 'POST', url: '/v1/selections', headers: { cookie }, payload: { subjectId: subj.id } });
  const selectionId = sel.json().selection.id;
  const goal = await app.inject({
    method: 'POST',
    url: '/v1/goals',
    headers: { cookie },
    payload: { selectionId, title: `Goal ${opts.code}`, metricType: 'numeric', target: opts.target, cadence: 'daily', dueDate: opts.dueDate },
  });
  return { selectionId, goalId: goal.json().id };
}

describe('Dashboard / Reminders / Export — US-09/10/12 (FR-019..021/024)', () => {
  let app: FastifyInstance;
  let student: AuthedStudent;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase();
    student = await signupStudent(app);
  });

  afterAll(async () => {
    await app.close();
    await closeTestDb();
  });

  describe('GET /v1/dashboard', () => {
    it('requires auth (401)', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/dashboard' });
      expect(res.statusCode).toBe(401);
    });

    it('[US-10][AC-2] returns an empty-but-valid shape for a new student', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/dashboard', headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.selections).toEqual([]);
      expect(body.activeGoals).toEqual([]);
      expect(body.aggregate).toMatchObject({ totalGoals: 0, completedGoals: 0, overallCompletionPct: 0 });
      expect(body.reminders).toEqual([]);
      expect(body.activeTerm).toEqual(expect.any(String));
    });

    it('[US-10][AC-1] aggregates selections, goals, completion and reminders', async () => {
      const { goalId } = await setupGoal(app, student.cookie, { code: 'CS101', target: 10, dueDate: isoInDays(3) });
      await app.inject({ method: 'POST', url: `/v1/goals/${goalId}/progress`, headers: { cookie: student.cookie }, payload: { value: 4 } });

      const res = await app.inject({ method: 'GET', url: '/v1/dashboard', headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.selections.length).toBe(1);
      expect(body.selections[0]).toMatchObject({ goalCount: 1, avgCompletionPct: 40 });
      expect(body.activeGoals.length).toBe(1);
      expect(body.activeGoals[0]).toMatchObject({ completionPct: 40, status: 'at_risk' });
      expect(body.aggregate).toMatchObject({ totalGoals: 1, completedGoals: 0, overallCompletionPct: 40 });
      // due in 3 days + <50% => at-risk reminder surfaced
      expect(body.reminders.length).toBeGreaterThanOrEqual(1);
      expect(body.reminders[0].goalId).toBe(goalId);
    });

    it('scopes to the requesting student (BR-004)', async () => {
      await setupGoal(app, student.cookie, { code: 'CS101', target: 10, dueDate: isoInDays(30) });
      const other = await signupStudent(app);
      const res = await app.inject({ method: 'GET', url: '/v1/dashboard', headers: { cookie: other.cookie } });
      expect(res.json().selections).toEqual([]);
      expect(res.json().activeGoals).toEqual([]);
    });
  });

  describe('GET /v1/reminders', () => {
    it('requires auth (401)', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/reminders' });
      expect(res.statusCode).toBe(401);
    });

    it('[US-09][AC-1] surfaces a reminder for a due-soon, low-completion goal', async () => {
      const { goalId } = await setupGoal(app, student.cookie, { code: 'CS101', target: 10, dueDate: isoInDays(2) });
      const res = await app.inject({ method: 'GET', url: '/v1/reminders', headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.map((r: { goalId: string }) => r.goalId)).toContain(goalId);
    });

    it('[US-09][AC-3][AC-4] clears the reminder once completed', async () => {
      const { goalId } = await setupGoal(app, student.cookie, { code: 'CS101', target: 10, dueDate: isoInDays(2) });
      await app.inject({ method: 'POST', url: `/v1/goals/${goalId}/progress`, headers: { cookie: student.cookie }, payload: { value: 10 } });
      const res = await app.inject({ method: 'GET', url: '/v1/reminders', headers: { cookie: student.cookie } });
      expect(res.json().data.map((r: { goalId: string }) => r.goalId)).not.toContain(goalId);
    });

    it('[US-09][AC-1] no reminder for a goal due far away with progress', async () => {
      const { goalId } = await setupGoal(app, student.cookie, { code: 'CS101', target: 10, dueDate: isoInDays(60) });
      await app.inject({ method: 'POST', url: `/v1/goals/${goalId}/progress`, headers: { cookie: student.cookie }, payload: { value: 6 } });
      const res = await app.inject({ method: 'GET', url: '/v1/reminders', headers: { cookie: student.cookie } });
      expect(res.json().data.map((r: { goalId: string }) => r.goalId)).not.toContain(goalId);
    });
  });

  describe('GET /v1/export', () => {
    it('requires auth (401)', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/export' });
      expect(res.statusCode).toBe(401);
    });

    it('[US-12][AC-1][AC-2] exports the student\'s own data as JSON', async () => {
      const { goalId } = await setupGoal(app, student.cookie, { code: 'CS101', target: 10, dueDate: isoInDays(30) });
      await app.inject({ method: 'POST', url: `/v1/goals/${goalId}/progress`, headers: { cookie: student.cookie }, payload: { value: 3 } });
      // a manually-added subject (owned)
      await app.inject({ method: 'POST', url: '/v1/subjects', headers: { cookie: student.cookie }, payload: { name: 'Owned X' } });

      const res = await app.inject({ method: 'GET', url: '/v1/export', headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment');
      const body = res.json();
      expect(body.student.id).toBe(student.studentId);
      expect(body.exportedAt).toEqual(expect.any(String));
      expect(body.selections.length).toBe(2); // CS101 + owned X
      expect(body.goals.length).toBe(1);
      expect(body.progressEntries.length).toBe(1);
      expect(body.subjects.length).toBe(1); // only the owned subject
    });

    it('scopes export to the requester only (BR-004)', async () => {
      await setupGoal(app, student.cookie, { code: 'CS101', target: 10, dueDate: isoInDays(30) });
      const other = await signupStudent(app);
      const res = await app.inject({ method: 'GET', url: '/v1/export', headers: { cookie: other.cookie } });
      expect(res.json().selections).toEqual([]);
      expect(res.json().goals).toEqual([]);
    });
  });
});
