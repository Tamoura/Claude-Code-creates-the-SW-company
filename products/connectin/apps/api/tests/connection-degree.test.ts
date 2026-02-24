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
let me: TestUser;
let first: TestUser;
let second: TestUser;
let third: TestUser;
let unconnected: TestUser;

async function connectUsers(a: string, b: string) {
  const db = getPrisma();
  await db.connection.create({
    data: { senderId: a, receiverId: b, status: 'ACCEPTED' },
  });
}

beforeAll(async () => {
  app = await getApp();
  await cleanDatabase();
  me = await createTestUser(app);
  first = await createTestUser(app);
  second = await createTestUser(app);
  third = await createTestUser(app);
  unconnected = await createTestUser(app);

  // me -> first (1st degree)
  await connectUsers(me.id, first.id);
  // first -> second (2nd degree from me)
  await connectUsers(first.id, second.id);
  // second -> third (3rd degree from me)
  await connectUsers(second.id, third.id);
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Connection Degree API', () => {
  describe('GET /api/v1/connections/degree/:userId', () => {
    it('should return 1st degree for direct connections', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/connections/degree/${first.id}`,
        headers: authHeaders(me.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.degree).toBe(1);
    });

    it('should return 2nd degree for friend-of-friend', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/connections/degree/${second.id}`,
        headers: authHeaders(me.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.degree).toBe(2);
    });

    it('should return 3rd degree for 3-hop connections', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/connections/degree/${third.id}`,
        headers: authHeaders(me.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.degree).toBe(3);
    });

    it('should return null degree for unconnected users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/connections/degree/${unconnected.id}`,
        headers: authHeaders(me.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.degree).toBeNull();
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/connections/degree/${first.id}`,
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
