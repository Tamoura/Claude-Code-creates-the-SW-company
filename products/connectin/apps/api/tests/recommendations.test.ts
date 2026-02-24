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
let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  app = await getApp();
});

afterAll(async () => {
  await closeApp();
});

beforeEach(async () => {
  await cleanDatabase();
  alice = await createTestUser(app, { displayName: 'Alice' });
  bob = await createTestUser(app, { displayName: 'Bob' });

  // Create an accepted connection between alice and bob
  const prisma = getPrisma();
  await prisma.connection.create({
    data: {
      senderId: alice.id,
      receiverId: bob.id,
      status: 'ACCEPTED',
      respondedAt: new Date(),
    },
  });
});

describe('Recommendations', () => {
  const validRecommendation = {
    content: 'Alice is an outstanding engineer who consistently delivers high-quality work.',
    relationship: 'Managed Alice directly at TechCorp',
  };

  it('should write a recommendation for a connection', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/recommendations/${alice.id}`,
      headers: authHeaders(bob.accessToken),
      payload: validRecommendation,
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.authorId).toBe(bob.id);
    expect(body.data.recipientId).toBe(alice.id);
    expect(body.data.status).toBe('PENDING');
  });

  it('should not allow recommending a non-connection', async () => {
    const charlie = await createTestUser(app, { displayName: 'Charlie' });
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/recommendations/${charlie.id}`,
      headers: authHeaders(bob.accessToken),
      payload: validRecommendation,
    });
    expect(res.statusCode).toBe(403);
  });

  it('should accept a pending recommendation', async () => {
    // Bob writes recommendation for Alice
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/recommendations/${alice.id}`,
      headers: authHeaders(bob.accessToken),
      payload: validRecommendation,
    });
    const recId = JSON.parse(createRes.body).data.id;

    // Alice accepts it
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/recommendations/${recId}/accept`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.status).toBe('ACCEPTED');
  });

  it('should decline a pending recommendation', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/recommendations/${alice.id}`,
      headers: authHeaders(bob.accessToken),
      payload: validRecommendation,
    });
    const recId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/recommendations/${recId}/decline`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.status).toBe('DECLINED');
  });

  it('should only show accepted recommendations on a profile', async () => {
    // Bob writes recommendation for Alice - Alice accepts
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/recommendations/${alice.id}`,
      headers: authHeaders(bob.accessToken),
      payload: validRecommendation,
    });
    const recId = JSON.parse(createRes.body).data.id;
    await app.inject({
      method: 'PUT',
      url: `/api/v1/recommendations/${recId}/accept`,
      headers: authHeaders(alice.accessToken),
    });

    // Get Alice's recommendations
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/recommendations/user/${alice.id}`,
      headers: authHeaders(bob.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(1);
    expect(body.data[0].status).toBe('ACCEPTED');
  });

  it('should not allow recommending yourself', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/recommendations/${alice.id}`,
      headers: authHeaders(alice.accessToken),
      payload: validRecommendation,
    });
    expect(res.statusCode).toBe(400);
  });

  it('should not allow duplicate recommendations', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/recommendations/${alice.id}`,
      headers: authHeaders(bob.accessToken),
      payload: validRecommendation,
    });
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/recommendations/${alice.id}`,
      headers: authHeaders(bob.accessToken),
      payload: validRecommendation,
    });
    expect(res.statusCode).toBe(409);
  });

  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/recommendations/user/${alice.id}`,
    });
    expect(res.statusCode).toBe(401);
  });
});
