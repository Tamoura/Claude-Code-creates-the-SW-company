import { FastifyInstance } from 'fastify';
import { buildTestApp, signupStudent, AuthedStudent } from '../helpers/app';
import { resetDatabase, closeTestDb, seedSubject, testPrisma } from '../helpers/db';

describe('Catalog & Subjects — US-02/03/05/11 (FR-004..006, FR-009, FR-010)', () => {
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

  describe('GET /v1/subjects (browse/search/filter)', () => {
    beforeEach(async () => {
      await seedSubject({ code: 'CS101', name: 'Intro to Programming', credits: 6, term: '2026-S1' });
      await seedSubject({ code: 'MATH101', name: 'Calculus I', credits: 6, term: '2026-S1' });
      await seedSubject({ code: 'BUS210', name: 'Financial Accounting', credits: 3, term: '2026-S2' });
    });

    it('[US-02][AC-1] requires auth (401 without cookie)', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/subjects' });
      expect(res.statusCode).toBe(401);
    });

    it('[US-02][AC-1] lists subjects in a paginated envelope', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/subjects',
        headers: { cookie: student.cookie },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.length).toBe(3);
      expect(body.pagination).toMatchObject({ page: 1, total: 3 });
      expect(body.data[0]).toHaveProperty('isSeed');
    });

    it('[US-02][AC-2] searches by name or code (q)', async () => {
      const byName = await app.inject({
        method: 'GET',
        url: '/v1/subjects?q=calculus',
        headers: { cookie: student.cookie },
      });
      expect(byName.json().data.map((s: { code: string }) => s.code)).toEqual(['MATH101']);

      const byCode = await app.inject({
        method: 'GET',
        url: '/v1/subjects?q=cs10',
        headers: { cookie: student.cookie },
      });
      expect(byCode.json().data.map((s: { code: string }) => s.code)).toEqual(['CS101']);
    });

    it('[US-02][AC-2] filters by credits and term', async () => {
      const byCredits = await app.inject({
        method: 'GET',
        url: '/v1/subjects?credits=3',
        headers: { cookie: student.cookie },
      });
      expect(byCredits.json().data.map((s: { code: string }) => s.code)).toEqual(['BUS210']);

      const byTerm = await app.inject({
        method: 'GET',
        url: '/v1/subjects?term=2026-S2',
        headers: { cookie: student.cookie },
      });
      expect(byTerm.json().data.map((s: { code: string }) => s.code)).toEqual(['BUS210']);
    });

    it('[US-02][AC-4] returns 200 with empty data when nothing matches', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/subjects?q=zzzznotfound',
        headers: { cookie: student.cookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
      expect(res.json().pagination.total).toBe(0);
    });
  });

  describe('GET /v1/subjects/:id (detail)', () => {
    it('[US-02][AC-3] returns full subject detail', async () => {
      const subj = await seedSubject({ code: 'CS210', name: 'Databases', credits: 6, description: 'SQL etc' });
      const res = await app.inject({
        method: 'GET',
        url: `/v1/subjects/${subj.id}`,
        headers: { cookie: student.cookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ code: 'CS210', description: 'SQL etc' });
    });

    it('[US-02] returns 404 for unknown id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/subjects/11111111-1111-1111-1111-111111111111`,
        headers: { cookie: student.cookie },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /v1/subjects/compare (US-03)', () => {
    it('[US-03][AC-1] compares 2-4 subjects', async () => {
      const a = await seedSubject({ code: 'CS101', name: 'A' });
      const b = await seedSubject({ code: 'CS201', name: 'B' });
      const res = await app.inject({
        method: 'GET',
        url: `/v1/subjects/compare?ids=${a.id},${b.id}`,
        headers: { cookie: student.cookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().subjects.map((s: { code: string }) => s.code).sort()).toEqual(['CS101', 'CS201']);
    });

    it('[US-03][AC-2] rejects fewer than 2 ids (400)', async () => {
      const a = await seedSubject({ code: 'CS101', name: 'A' });
      const res = await app.inject({
        method: 'GET',
        url: `/v1/subjects/compare?ids=${a.id}`,
        headers: { cookie: student.cookie },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /v1/subjects (manual add, US-05)', () => {
    it('[US-05][AC-1] creates an owned subject and auto-selects it', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/subjects',
        headers: { cookie: student.cookie },
        payload: { name: 'My Custom Subject', code: 'X999' },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.subject).toMatchObject({ name: 'My Custom Subject', isSeed: false });
      expect(body.subject.ownerStudentId).toBe(student.studentId);
      expect(body.selection).toMatchObject({ subjectId: body.subject.id });

      // selection persisted for active term
      const sel = await testPrisma.selection.findUnique({ where: { id: body.selection.id } });
      expect(sel).not.toBeNull();
      expect(sel!.studentId).toBe(student.studentId);
    });

    it('[US-05][AC-1] requires a name (400)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/subjects',
        headers: { cookie: student.cookie },
        payload: { code: 'X999' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH/DELETE /v1/subjects/:id (US-05/11, BR-005)', () => {
    it('[US-05][AC-2] edits an owned subject', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/v1/subjects',
        headers: { cookie: student.cookie },
        payload: { name: 'Editable' },
      });
      const id = created.json().subject.id;
      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/subjects/${id}`,
        headers: { cookie: student.cookie },
        payload: { name: 'Edited Name' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Edited Name');
    });

    it('[US-05][AC-3] rejects editing a seed subject (403)', async () => {
      const seed = await seedSubject({ code: 'CS101', name: 'Seed' });
      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/subjects/${seed.id}`,
        headers: { cookie: student.cookie },
        payload: { name: 'hacked' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('[US-05][AC-3] rejects deleting a seed subject (403)', async () => {
      const seed = await seedSubject({ code: 'CS101', name: 'Seed' });
      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/subjects/${seed.id}`,
        headers: { cookie: student.cookie },
      });
      expect(res.statusCode).toBe(403);
    });

    it('[US-11][AC-4] cannot edit another student\'s owned subject (404)', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/v1/subjects',
        headers: { cookie: student.cookie },
        payload: { name: 'Mine' },
      });
      const id = created.json().subject.id;

      const other = await signupStudent(app);
      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/subjects/${id}`,
        headers: { cookie: other.cookie },
        payload: { name: 'stolen' },
      });
      expect([403, 404]).toContain(res.statusCode);
    });

    it('[US-11] deletes an owned subject (204)', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/v1/subjects',
        headers: { cookie: student.cookie },
        payload: { name: 'ToDelete' },
      });
      const id = created.json().subject.id;
      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/subjects/${id}`,
        headers: { cookie: student.cookie },
      });
      expect(res.statusCode).toBe(204);
    });
  });
});
