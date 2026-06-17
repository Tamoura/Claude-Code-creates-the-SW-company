import { FastifyInstance } from 'fastify';
import { buildTestApp, signupStudent, AuthedStudent } from '../helpers/app';
import { resetDatabase, closeTestDb, seedSubject } from '../helpers/db';

const FUTURE_DUE = '2026-12-31';

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoTomorrow(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

describe('Progress — US-07/08/11 (FR-014/015/016/017/018/022)', () => {
  let app: FastifyInstance;
  let student: AuthedStudent;
  let goalId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase();
    student = await signupStudent(app);
    const subj = await seedSubject({ code: 'CS101', name: 'Intro' });
    const sel = await app.inject({ method: 'POST', url: '/v1/selections', headers: { cookie: student.cookie }, payload: { subjectId: subj.id } });
    const goal = await app.inject({
      method: 'POST',
      url: '/v1/goals',
      headers: { cookie: student.cookie },
      payload: { selectionId: sel.json().selection.id, title: 'g', metricType: 'numeric', target: 10, cadence: 'daily', dueDate: FUTURE_DUE },
    });
    goalId = goal.json().id;
  });

  afterAll(async () => {
    await app.close();
    await closeTestDb();
  });

  describe('POST /v1/goals/:goalId/progress', () => {
    it('requires auth (401)', async () => {
      const res = await app.inject({ method: 'POST', url: `/v1/goals/${goalId}/progress`, payload: { value: 1 } });
      expect(res.statusCode).toBe(401);
    });

    it('[US-07][AC-1][AC-2] logs progress and returns recomputed goal metrics', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/goals/${goalId}/progress`,
        headers: { cookie: student.cookie },
        payload: { value: 5, entryDate: isoToday(), note: 'half way' },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.progressEntry).toMatchObject({ note: 'half way' });
      expect(Number(body.progressEntry.value)).toBe(5);
      expect(body.goal.completionPct).toBe(50);
      expect(body.goal.streak).toBe(1);
    });

    it('[US-07][AC-1] defaults entryDate to today', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/goals/${goalId}/progress`,
        headers: { cookie: student.cookie },
        payload: { value: 1 },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().progressEntry.entryDate).toBe(isoToday());
    });

    it('[US-07][AC-3] rejects a future-dated entry (400/422)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/goals/${goalId}/progress`,
        headers: { cookie: student.cookie },
        payload: { value: 1, entryDate: isoTomorrow() },
      });
      expect([400, 422]).toContain(res.statusCode);
    });

    it('transitions goal to completed at 100% (BR-003)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/goals/${goalId}/progress`,
        headers: { cookie: student.cookie },
        payload: { value: 10 },
      });
      expect(res.json().goal.completionPct).toBe(100);
      expect(res.json().goal.status).toBe('completed');
    });

    it('[US-07] cannot log progress on another student\'s goal (404)', async () => {
      const other = await signupStudent(app);
      const res = await app.inject({
        method: 'POST',
        url: `/v1/goals/${goalId}/progress`,
        headers: { cookie: other.cookie },
        payload: { value: 1 },
      });
      expect([403, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /v1/goals/:goalId/progress', () => {
    it('[US-08] lists entries ordered by entryDate desc', async () => {
      await app.inject({ method: 'POST', url: `/v1/goals/${goalId}/progress`, headers: { cookie: student.cookie }, payload: { value: 1, entryDate: '2026-06-01' } });
      await app.inject({ method: 'POST', url: `/v1/goals/${goalId}/progress`, headers: { cookie: student.cookie }, payload: { value: 1, entryDate: '2026-06-03' } });
      const res = await app.inject({ method: 'GET', url: `/v1/goals/${goalId}/progress`, headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.map((e: { entryDate: string }) => e.entryDate)).toEqual(['2026-06-03', '2026-06-01']);
    });
  });

  describe('PATCH/DELETE /v1/progress/:id', () => {
    async function logEntry(value: number, entryDate?: string) {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/goals/${goalId}/progress`,
        headers: { cookie: student.cookie },
        payload: { value, ...(entryDate ? { entryDate } : {}) },
      });
      return res.json().progressEntry.id as string;
    }

    it('[US-07][AC-4] edits an entry and recomputes goal metrics', async () => {
      const id = await logEntry(3);
      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/progress/${id}`,
        headers: { cookie: student.cookie },
        payload: { value: 8 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().goal.completionPct).toBe(80);
    });

    it('[US-07][AC-3] rejects editing to a future date (400/422)', async () => {
      const id = await logEntry(3);
      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/progress/${id}`,
        headers: { cookie: student.cookie },
        payload: { entryDate: isoTomorrow() },
      });
      expect([400, 422]).toContain(res.statusCode);
    });

    it('[US-11] deletes an entry and recomputes metrics (204)', async () => {
      const id = await logEntry(10); // 100%
      const res = await app.inject({ method: 'DELETE', url: `/v1/progress/${id}`, headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(204);
      const detail = await app.inject({ method: 'GET', url: `/v1/goals/${goalId}`, headers: { cookie: student.cookie } });
      expect(detail.json().completionPct).toBe(0);
      expect(detail.json().status).toBe('active');
    });

    it('[US-11][AC-4] cannot edit another student\'s entry (404)', async () => {
      const id = await logEntry(3);
      const other = await signupStudent(app);
      const res = await app.inject({ method: 'PATCH', url: `/v1/progress/${id}`, headers: { cookie: other.cookie }, payload: { value: 9 } });
      expect([403, 404]).toContain(res.statusCode);
    });
  });
});
