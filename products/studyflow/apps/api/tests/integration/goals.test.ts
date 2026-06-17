import { FastifyInstance } from 'fastify';
import { buildTestApp, signupStudent, AuthedStudent } from '../helpers/app';
import { resetDatabase, closeTestDb, seedSubject, testPrisma } from '../helpers/db';

const FUTURE = '2026-12-31';
const PAST = '2020-01-01';

async function makeSelection(app: FastifyInstance, cookie: string): Promise<string> {
  const subj = await seedSubject({ code: 'CS101', name: 'Intro' });
  const res = await app.inject({
    method: 'POST',
    url: '/v1/selections',
    headers: { cookie },
    payload: { subjectId: subj.id },
  });
  return res.json().selection.id;
}

describe('Goals — US-06/08/11 (FR-011/012/013/022/023)', () => {
  let app: FastifyInstance;
  let student: AuthedStudent;
  let selectionId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase();
    student = await signupStudent(app);
    selectionId = await makeSelection(app, student.cookie);
  });

  afterAll(async () => {
    await app.close();
    await closeTestDb();
  });

  function createGoal(payload: Record<string, unknown>, cookie = student.cookie) {
    return app.inject({ method: 'POST', url: '/v1/goals', headers: { cookie }, payload });
  }

  describe('POST /v1/goals', () => {
    it('requires auth (401)', async () => {
      const res = await app.inject({ method: 'POST', url: '/v1/goals', payload: {} });
      expect(res.statusCode).toBe(401);
    });

    it('[US-06][AC-1] creates an active goal bound to the selection', async () => {
      const res = await createGoal({
        selectionId,
        title: 'Read 12 chapters',
        metricType: 'numeric',
        target: 12,
        cadence: 'daily',
        dueDate: FUTURE,
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toMatchObject({ title: 'Read 12 chapters', status: 'active', metricType: 'numeric' });
      expect(body.completionPct).toBe(0);
      expect(body.streak).toBe(0);
      expect(Number(body.target)).toBe(12);
    });

    it('[US-06][AC-3] rejects a past due date (400/422)', async () => {
      const res = await createGoal({
        selectionId, title: 'x', metricType: 'numeric', target: 5, dueDate: PAST,
      });
      expect([400, 422]).toContain(res.statusCode);
    });

    it('[US-06][AC-2] rejects an invalid metric type (400)', async () => {
      const res = await createGoal({
        selectionId, title: 'x', metricType: 'bogus', target: 5, dueDate: FUTURE,
      });
      expect(res.statusCode).toBe(400);
    });

    it('[US-06][AC-4] rejects a goal on a non-owned selection (403/404)', async () => {
      const other = await signupStudent(app);
      const res = await createGoal({
        selectionId, title: 'x', metricType: 'numeric', target: 5, dueDate: FUTURE,
      }, other.cookie);
      expect([403, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /v1/goals + GET /v1/goals/:id', () => {
    it('[US-08] lists goals with derived metrics', async () => {
      await createGoal({ selectionId, title: 'g1', metricType: 'numeric', target: 10, dueDate: FUTURE });
      const res = await app.inject({ method: 'GET', url: '/v1/goals', headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(1);
      expect(res.json().data[0]).toHaveProperty('completionPct');
      expect(res.json().pagination.total).toBe(1);
    });

    it('[US-08] filters by selectionId and status', async () => {
      await createGoal({ selectionId, title: 'g1', metricType: 'numeric', target: 10, dueDate: FUTURE });
      const byStatus = await app.inject({ method: 'GET', url: '/v1/goals?status=active', headers: { cookie: student.cookie } });
      expect(byStatus.json().data.length).toBe(1);
      const bySel = await app.inject({ method: 'GET', url: `/v1/goals?selectionId=${selectionId}`, headers: { cookie: student.cookie } });
      expect(bySel.json().data.length).toBe(1);
    });

    it('[US-08] goal detail includes progressEntries and atRisk', async () => {
      const created = await createGoal({ selectionId, title: 'g1', metricType: 'numeric', target: 10, dueDate: FUTURE });
      const id = created.json().id;
      const res = await app.inject({ method: 'GET', url: `/v1/goals/${id}`, headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('atRisk');
      expect(res.json().progressEntries).toEqual([]);
    });

    it('[US-11][AC-4] cannot read another student\'s goal (404)', async () => {
      const created = await createGoal({ selectionId, title: 'g1', metricType: 'numeric', target: 10, dueDate: FUTURE });
      const other = await signupStudent(app);
      const res = await app.inject({ method: 'GET', url: `/v1/goals/${created.json().id}`, headers: { cookie: other.cookie } });
      expect([403, 404]).toContain(res.statusCode);
    });
  });

  describe('PATCH/DELETE/abandon', () => {
    it('[US-11][AC-1] edits a goal and recomputes status', async () => {
      const created = await createGoal({ selectionId, title: 'g1', metricType: 'numeric', target: 10, dueDate: FUTURE });
      const id = created.json().id;
      const res = await app.inject({ method: 'PATCH', url: `/v1/goals/${id}`, headers: { cookie: student.cookie }, payload: { title: 'renamed' } });
      expect(res.statusCode).toBe(200);
      expect(res.json().title).toBe('renamed');
    });

    it('abandon sets status to abandoned', async () => {
      const created = await createGoal({ selectionId, title: 'g1', metricType: 'numeric', target: 10, dueDate: FUTURE });
      const id = created.json().id;
      const res = await app.inject({ method: 'POST', url: `/v1/goals/${id}/abandon`, headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('abandoned');
    });

    it('[US-11][AC-2] deletes a goal and cascades its progress entries (204)', async () => {
      const created = await createGoal({ selectionId, title: 'g1', metricType: 'numeric', target: 10, dueDate: FUTURE });
      const id = created.json().id;
      await testPrisma.progressEntry.create({ data: { goalId: id, entryDate: new Date('2026-06-01'), value: 1 } });

      const res = await app.inject({ method: 'DELETE', url: `/v1/goals/${id}`, headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(204);
      expect(await testPrisma.progressEntry.count({ where: { goalId: id } })).toBe(0);
      // parent selection unaffected
      expect(await testPrisma.selection.count({ where: { id: selectionId } })).toBe(1);
    });

    it('[US-11][AC-4] cannot delete another student\'s goal (404)', async () => {
      const created = await createGoal({ selectionId, title: 'g1', metricType: 'numeric', target: 10, dueDate: FUTURE });
      const other = await signupStudent(app);
      const res = await app.inject({ method: 'DELETE', url: `/v1/goals/${created.json().id}`, headers: { cookie: other.cookie } });
      expect([403, 404]).toContain(res.statusCode);
    });
  });
});
