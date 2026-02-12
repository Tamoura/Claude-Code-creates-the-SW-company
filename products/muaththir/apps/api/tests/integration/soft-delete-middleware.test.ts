import { FastifyInstance } from 'fastify';
import {
  setupTestDb,
  cleanDb,
  closeDb,
  createTestApp,
  prisma,
} from '../helpers/build-app';

let app: FastifyInstance;
let accessToken: string;
let parentId: string;
let childId: string;

const validRegistration = {
  name: 'Fatima Ahmed',
  email: 'fatima@example.com',
  password: 'SecurePass1',
};

async function registerAndGetToken(): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: validRegistration,
  });
  parentId = res.json().user.id;
  return res.json().accessToken;
}

async function createChild(): Promise<string> {
  const child = await prisma.child.create({
    data: {
      parentId,
      name: 'Ahmad',
      dateOfBirth: new Date('2018-05-15'),
      gender: 'male',
    },
  });
  return child.id;
}

beforeAll(async () => {
  await setupTestDb();
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

beforeEach(async () => {
  await cleanDb();
  accessToken = await registerAndGetToken();
  childId = await createChild();
});

describe('Soft-delete Prisma middleware', () => {
  it('should exclude soft-deleted observations from children list _count', async () => {
    // Create 3 observations
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'POST',
        url: `/api/children/${childId}/observations`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          dimension: 'academic',
          content: `Observation ${i + 1}`,
          sentiment: 'positive',
        },
      });
    }

    // Soft-delete one directly
    const allObs = await prisma.observation.findMany({
      where: { childId },
    });
    await prisma.observation.update({
      where: { id: allObs[0].id },
      data: { deletedAt: new Date() },
    });

    // Verify children list shows correct count (2, not 3)
    const response = await app.inject({
      method: 'GET',
      url: '/api/children',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data[0].observationCount).toBe(2);
  });

  it('should auto-filter soft-deleted observations in findMany queries', async () => {
    // Create an observation via the API
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/observations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        dimension: 'academic',
        content: 'Test observation',
        sentiment: 'positive',
      },
    });
    const obsId = createRes.json().id;

    // Soft-delete it directly in the database
    await prisma.observation.update({
      where: { id: obsId },
      data: { deletedAt: new Date() },
    });

    // List observations via the API - should not include deleted
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(0);
    expect(response.json().pagination.total).toBe(0);
  });

  it('should auto-filter soft-deleted observations in findFirst queries', async () => {
    // Create an observation via the API
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/observations`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        dimension: 'academic',
        content: 'Test observation',
        sentiment: 'positive',
      },
    });
    const obsId = createRes.json().id;

    // Soft-delete it directly
    await prisma.observation.update({
      where: { id: obsId },
      data: { deletedAt: new Date() },
    });

    // Try to get specific observation - should return 404
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations/${obsId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should auto-filter soft-deleted observations in dashboard recent', async () => {
    // Create 3 observations
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'POST',
        url: `/api/children/${childId}/observations`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          dimension: 'academic',
          content: `Observation ${i + 1}`,
          sentiment: 'positive',
        },
      });
    }

    // Soft-delete one
    const allObs = await prisma.observation.findMany({
      where: { childId },
    });
    await prisma.observation.update({
      where: { id: allObs[0].id },
      data: { deletedAt: new Date() },
    });

    // Dashboard recent should only show 2
    const response = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/recent`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(2);
  });
});
