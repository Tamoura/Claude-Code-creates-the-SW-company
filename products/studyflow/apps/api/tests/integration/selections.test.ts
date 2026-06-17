import { FastifyInstance } from 'fastify';
import { buildTestApp, signupStudent, AuthedStudent } from '../helpers/app';
import { resetDatabase, closeTestDb, seedSubject, testPrisma } from '../helpers/db';

async function createGoalForSelection(selectionId: string) {
  return testPrisma.goal.create({
    data: {
      selectionId,
      title: 'g',
      metricType: 'numeric',
      target: 10,
      cadence: 'daily',
      dueDate: new Date('2026-12-31'),
      status: 'active',
    },
  });
}

describe('Selections — US-04/11/13 (FR-007, FR-008, FR-025, C-7)', () => {
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

  describe('POST /v1/selections', () => {
    it('requires auth (401)', async () => {
      const res = await app.inject({ method: 'POST', url: '/v1/selections', payload: { subjectId: '11111111-1111-1111-1111-111111111111' } });
      expect(res.statusCode).toBe(401);
    });

    it('[US-04][AC-1] adds a catalog subject to the plan (201)', async () => {
      const subj = await seedSubject({ code: 'CS101', name: 'Intro', prerequisites: '' });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/selections',
        headers: { cookie: student.cookie },
        payload: { subjectId: subj.id },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().selection).toMatchObject({ subjectId: subj.id });
      expect(res.json().prerequisiteWarning).toBeUndefined();
    });

    it('[US-04][AC-2] rejects duplicate subject+term (409)', async () => {
      const subj = await seedSubject({ code: 'CS101', name: 'Intro' });
      await app.inject({ method: 'POST', url: '/v1/selections', headers: { cookie: student.cookie }, payload: { subjectId: subj.id } });
      const dup = await app.inject({ method: 'POST', url: '/v1/selections', headers: { cookie: student.cookie }, payload: { subjectId: subj.id } });
      expect(dup.statusCode).toBe(409);
    });

    it('returns 404 for unknown subject', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/selections',
        headers: { cookie: student.cookie },
        payload: { subjectId: '11111111-1111-1111-1111-111111111111' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('[US-13][AC-1] surfaces an advisory prerequisite warning (still 201)', async () => {
      const res2 = await seedSubject({ code: 'CS201', name: 'DSA', prerequisites: 'CS101' });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/selections',
        headers: { cookie: student.cookie },
        payload: { subjectId: res2.id },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().prerequisiteWarning).toEqual({ unmet: ['CS101'] });
    });

    it('[US-13][AC-2] no warning when prerequisites are met', async () => {
      const cs101 = await seedSubject({ code: 'CS101', name: 'Intro', prerequisites: '' });
      const cs201 = await seedSubject({ code: 'CS201', name: 'DSA', prerequisites: 'CS101' });
      await app.inject({ method: 'POST', url: '/v1/selections', headers: { cookie: student.cookie }, payload: { subjectId: cs101.id } });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/selections',
        headers: { cookie: student.cookie },
        payload: { subjectId: cs201.id },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().prerequisiteWarning).toBeUndefined();
    });

    it('[US-13][AC-3] records prereqWarningAck', async () => {
      const cs201 = await seedSubject({ code: 'CS201', name: 'DSA', prerequisites: 'CS101' });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/selections',
        headers: { cookie: student.cookie },
        payload: { subjectId: cs201.id, prereqWarningAck: true },
      });
      expect(res.statusCode).toBe(201);
      const sel = await testPrisma.selection.findUnique({ where: { id: res.json().selection.id } });
      expect(sel!.prereqWarningAck).toBe(true);
    });
  });

  describe('GET /v1/selections', () => {
    it('[US-04] lists my selections with subject + goalCount', async () => {
      const subj = await seedSubject({ code: 'CS101', name: 'Intro' });
      const created = await app.inject({ method: 'POST', url: '/v1/selections', headers: { cookie: student.cookie }, payload: { subjectId: subj.id } });
      await createGoalForSelection(created.json().selection.id);

      const res = await app.inject({ method: 'GET', url: '/v1/selections', headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0]).toMatchObject({ goalCount: 1 });
      expect(body.data[0].subject).toMatchObject({ code: 'CS101' });
    });

    it('scopes to the requesting student only (BR-004)', async () => {
      const subj = await seedSubject({ code: 'CS101', name: 'Intro' });
      await app.inject({ method: 'POST', url: '/v1/selections', headers: { cookie: student.cookie }, payload: { subjectId: subj.id } });
      const other = await signupStudent(app);
      const res = await app.inject({ method: 'GET', url: '/v1/selections', headers: { cookie: other.cookie } });
      expect(res.json().data).toEqual([]);
    });
  });

  describe('DELETE /v1/selections/:id', () => {
    it('[US-04][AC-3] removes a selection with no goals (204)', async () => {
      const subj = await seedSubject({ code: 'CS101', name: 'Intro' });
      const created = await app.inject({ method: 'POST', url: '/v1/selections', headers: { cookie: student.cookie }, payload: { subjectId: subj.id } });
      const res = await app.inject({ method: 'DELETE', url: `/v1/selections/${created.json().selection.id}`, headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(204);
    });

    it('[US-04][AC-3][C-7] blocks removal when goals exist (409 + dependentGoals)', async () => {
      const subj = await seedSubject({ code: 'CS101', name: 'Intro' });
      const created = await app.inject({ method: 'POST', url: '/v1/selections', headers: { cookie: student.cookie }, payload: { subjectId: subj.id } });
      const selId = created.json().selection.id;
      const goal = await createGoalForSelection(selId);

      const res = await app.inject({ method: 'DELETE', url: `/v1/selections/${selId}`, headers: { cookie: student.cookie } });
      expect(res.statusCode).toBe(409);
      expect(res.json().dependentGoals).toEqual([{ id: goal.id, title: 'g' }]);
    });

    it('[US-11][AC-4] cannot delete another student\'s selection (404)', async () => {
      const subj = await seedSubject({ code: 'CS101', name: 'Intro' });
      const created = await app.inject({ method: 'POST', url: '/v1/selections', headers: { cookie: student.cookie }, payload: { subjectId: subj.id } });
      const other = await signupStudent(app);
      const res = await app.inject({ method: 'DELETE', url: `/v1/selections/${created.json().selection.id}`, headers: { cookie: other.cookie } });
      expect([403, 404]).toContain(res.statusCode);
    });
  });
});
