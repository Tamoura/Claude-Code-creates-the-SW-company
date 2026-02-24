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
let userA: TestUser;
let userB: TestUser;
let mutual1: TestUser;
let mutual2: TestUser;
let stranger: TestUser;

async function connectUsers(a: string, b: string) {
  const db = getPrisma();
  await db.connection.create({
    data: { senderId: a, receiverId: b, status: 'ACCEPTED' },
  });
}

beforeAll(async () => {
  app = await getApp();
  await cleanDatabase();
  userA = await createTestUser(app);
  userB = await createTestUser(app);
  mutual1 = await createTestUser(app);
  mutual2 = await createTestUser(app);
  stranger = await createTestUser(app);

  // Create connections: mutual1 and mutual2 are connected to both A and B
  await connectUsers(userA.id, mutual1.id);
  await connectUsers(userB.id, mutual1.id);
  await connectUsers(userA.id, mutual2.id);
  await connectUsers(userB.id, mutual2.id);
  // stranger is only connected to A
  await connectUsers(userA.id, stranger.id);
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Mutual Connections API', () => {
  describe('GET /api/v1/connections/mutual/:userId', () => {
    it('should return mutual connections between two users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/connections/mutual/${userB.id}`,
        headers: authHeaders(userA.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.count).toBe(2);
      expect(json.data.users).toHaveLength(2);
      const ids = json.data.users.map((u: { id: string }) => u.id);
      expect(ids).toContain(mutual1.id);
      expect(ids).toContain(mutual2.id);
    });

    it('should return 0 when no mutual connections', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/connections/mutual/${stranger.id}`,
        headers: authHeaders(userB.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.count).toBe(0);
      expect(json.data.users).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/connections/mutual/${userB.id}`,
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
