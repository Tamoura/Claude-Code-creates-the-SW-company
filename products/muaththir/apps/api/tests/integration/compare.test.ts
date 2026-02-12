import { FastifyInstance } from 'fastify';
import {
  setupTestDb,
  cleanDb,
  closeDb,
  createTestApp,
  prisma,
} from '../helpers/build-app';

let app: FastifyInstance;

const parentInfo = {
  name: 'Compare Parent',
  email: 'compare-parent@test.com',
  password: 'SecurePass1',
};

async function registerAndGetToken(
  overrides: Partial<typeof parentInfo> = {}
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { ...parentInfo, ...overrides },
  });
  return res.json().accessToken;
}

function childDob(ageYears: number): string {
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - ageYears);
  return dob.toISOString().split('T')[0];
}

async function createChild(
  token: string,
  name = 'Test Child',
  ageYears = 7
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/children',
    headers: { authorization: `Bearer ${token}` },
    payload: { name, dateOfBirth: childDob(ageYears) },
  });
  return res.json();
}

async function createObservation(
  token: string,
  childId: string,
  dimension: string,
  sentiment: string
) {
  const res = await app.inject({
    method: 'POST',
    url: `/api/children/${childId}/observations`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      dimension,
      content: `Test observation for ${dimension}`,
      sentiment,
    },
  });
  return res.json();
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
});

describe('GET /api/children/compare', () => {
  let authToken: string;

  beforeEach(async () => {
    // Register as premium to allow multiple children
    authToken = await registerAndGetToken();
    // Upgrade to premium
    const parent = await prisma.parent.findFirst({
      where: { email: parentInfo.email },
    });
    await prisma.parent.update({
      where: { id: parent!.id },
      data: { subscriptionTier: 'premium' },
    });
  });

  it('should require authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/children/compare?childIds=id1,id2',
    });
    expect(res.statusCode).toBe(401);
  });

  it('should return 400 if childIds query param is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/children/compare',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(422);
  });

  it('should return 400 if childIds is empty', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/children/compare?childIds=',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(422);
  });

  it('should return 404 if any child does not belong to parent', async () => {
    const child1 = await createChild(authToken, 'Child A', 7);

    const otherToken = await registerAndGetToken({
      email: 'other-compare@test.com',
      name: 'Other Parent',
    });
    const otherChild = await createChild(otherToken, 'Other Child', 8);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/compare?childIds=${child1.id},${otherChild.id}`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return dashboard summaries for two children', async () => {
    const child1 = await createChild(authToken, 'Ahmad', 7);
    const child2 = await createChild(authToken, 'Sara', 10);

    // Add observations to child1
    for (let i = 0; i < 5; i++) {
      await createObservation(authToken, child1.id, 'academic', 'positive');
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/compare?childIds=${child1.id},${child2.id}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.children).toHaveLength(2);

    const ahmad = body.children.find(
      (c: any) => c.childId === child1.id
    );
    const sara = body.children.find(
      (c: any) => c.childId === child2.id
    );

    expect(ahmad).toBeDefined();
    expect(ahmad.childName).toBe('Ahmad');
    expect(ahmad.overallScore).toBeGreaterThan(0);
    expect(ahmad.dimensions).toHaveLength(6);

    expect(sara).toBeDefined();
    expect(sara.childName).toBe('Sara');
    expect(sara.overallScore).toBe(0);
    expect(sara.dimensions).toHaveLength(6);
  });

  it('should work with a single childId', async () => {
    const child = await createChild(authToken, 'Ahmad', 7);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/compare?childIds=${child.id}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.children).toHaveLength(1);
    expect(body.children[0].childId).toBe(child.id);
    expect(body.children[0].childName).toBe('Ahmad');
  });

  it('should return correct response structure for each child', async () => {
    const child = await createChild(authToken, 'Ahmad', 7);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/compare?childIds=${child.id}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    const entry = body.children[0];

    expect(entry).toHaveProperty('childId');
    expect(entry).toHaveProperty('childName');
    expect(entry).toHaveProperty('overallScore');
    expect(entry).toHaveProperty('dimensions');
    expect(entry.dimensions).toHaveLength(6);

    const dim = entry.dimensions[0];
    expect(dim).toHaveProperty('dimension');
    expect(dim).toHaveProperty('score');
  });
});
