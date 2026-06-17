import { FastifyInstance } from 'fastify';
import { buildTestApp, signupStudent, AuthedStudent } from '../helpers/app';
import { resetDatabase, closeTestDb, seedSubject } from '../helpers/db';

/**
 * Regression: a state-changing request that carries `Content-Type:
 * application/json` but an EMPTY body (common from browser fetch on
 * DELETE/POST) must NOT 500. Fastify raises FST_ERR_CTP_EMPTY_JSON_BODY
 * (a FastifyError with statusCode 400); the error handler must honour that.
 */
describe('Error handling — empty JSON body', () => {
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

  it('DELETE with empty json body + content-type returns the real status, not 500', async () => {
    const subj = await seedSubject({ code: 'CS101', name: 'Intro' });
    const sel = await app.inject({
      method: 'POST',
      url: '/v1/selections',
      headers: { cookie: student.cookie },
      payload: { subjectId: subj.id },
    });
    const selectionId = sel.json().selection.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/selections/${selectionId}`,
      headers: { cookie: student.cookie, 'content-type': 'application/json' },
      // no payload — empty body with json content-type
    });
    // Should succeed (204) — never 500.
    expect(res.statusCode).not.toBe(500);
    expect(res.statusCode).toBe(204);
  });

  it('logout (POST, no body) with json content-type does not 500', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: { cookie: student.cookie, 'content-type': 'application/json' },
    });
    expect(res.statusCode).not.toBe(500);
    expect(res.statusCode).toBe(204);
  });
});
