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
  // Create a profile for the user
  await app.inject({
    method: 'PUT',
    url: '/api/v1/profiles/me',
    headers: authHeaders(user.accessToken),
    payload: { headlineEn: 'Test Engineer' },
  });
});

describe('Certifications', () => {
  const validCert = {
    name: 'AWS Solutions Architect',
    issuingOrg: 'Amazon Web Services',
    credentialId: 'ABC-123',
    credentialUrl: 'https://aws.amazon.com/verify/ABC-123',
    issueDate: '2025-06-15',
    expiryDate: '2028-06-15',
  };

  it('should add a certification to profile', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/certifications',
      headers: authHeaders(user.accessToken),
      payload: validCert,
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.name).toBe(validCert.name);
    expect(body.data.issuingOrg).toBe(validCert.issuingOrg);
    expect(body.data.credentialId).toBe(validCert.credentialId);
  });

  it('should list certifications for the current user', async () => {
    // Add two certs
    await app.inject({
      method: 'POST',
      url: '/api/v1/certifications',
      headers: authHeaders(user.accessToken),
      payload: validCert,
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/certifications',
      headers: authHeaders(user.accessToken),
      payload: {
        name: 'PMP',
        issuingOrg: 'PMI',
        issueDate: '2024-01-01',
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/certifications',
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(2);
  });

  it('should delete a certification', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/certifications',
      headers: authHeaders(user.accessToken),
      payload: validCert,
    });
    const certId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/certifications/${certId}`,
      headers: authHeaders(user.accessToken),
    });
    expect(res.statusCode).toBe(200);

    // Verify it's gone
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/certifications',
      headers: authHeaders(user.accessToken),
    });
    expect(JSON.parse(listRes.body).data.length).toBe(0);
  });

  it('should reject certification without required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/certifications',
      headers: authHeaders(user.accessToken),
      payload: { name: 'AWS' }, // missing issuingOrg and issueDate
    });
    expect(res.statusCode).toBe(422);
  });

  it('should not allow deleting another user\'s certification', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/certifications',
      headers: authHeaders(user.accessToken),
      payload: validCert,
    });
    const certId = JSON.parse(createRes.body).data.id;

    const other = await createTestUser(app);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/certifications/${certId}`,
      headers: authHeaders(other.accessToken),
    });
    expect(res.statusCode).toBe(403);
  });

  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/certifications',
    });
    expect(res.statusCode).toBe(401);
  });
});
