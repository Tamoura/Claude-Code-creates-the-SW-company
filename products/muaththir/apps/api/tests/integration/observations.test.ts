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

async function createChild(token: string): Promise<string> {
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

async function createObservation(
  token: string,
  cId: string,
  overrides: Record<string, unknown> = {}
) {
  return app.inject({
    method: 'POST',
    url: `/api/children/${cId}/observations`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      dimension: 'academic',
      content: 'Ahmad completed his math homework independently today',
      sentiment: 'positive',
      ...overrides,
    },
  });
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
  childId = await createChild(accessToken);
});

describe('POST /api/children/:childId/observations', () => {
  it('should create an observation and return 201', async () => {
    const response = await createObservation(accessToken, childId);

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.childId).toBe(childId);
    expect(body.dimension).toBe('academic');
    expect(body.content).toBe(
      'Ahmad completed his math homework independently today'
    );
    expect(body.sentiment).toBe('positive');
    expect(body.tags).toEqual([]);
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it('should default observedAt to today when not provided', async () => {
    const response = await createObservation(accessToken, childId);

    expect(response.statusCode).toBe(201);
    const body = response.json();
    const today = new Date().toISOString().split('T')[0];
    expect(body.observedAt).toBe(today);
  });

  it('should accept a valid observedAt date', async () => {
    const response = await createObservation(accessToken, childId, {
      observedAt: '2026-01-15',
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().observedAt).toBe('2026-01-15');
  });

  it('should accept tags', async () => {
    const response = await createObservation(accessToken, childId, {
      tags: ['homework', 'math'],
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().tags).toEqual(['homework', 'math']);
  });

  it('should reject observedAt more than 1 year ago', async () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const dateStr = twoYearsAgo.toISOString().split('T')[0];

    const response = await createObservation(accessToken, childId, {
      observedAt: dateStr,
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject content longer than 1000 characters', async () => {
    const response = await createObservation(accessToken, childId, {
      content: 'x'.repeat(1001),
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject empty content', async () => {
    const response = await createObservation(accessToken, childId, {
      content: '',
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject invalid dimension', async () => {
    const response = await createObservation(accessToken, childId, {
      dimension: 'invalid_dimension',
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject invalid sentiment', async () => {
    const response = await createObservation(accessToken, childId, {
      sentiment: 'bad',
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject more than 5 tags', async () => {
    const response = await createObservation(accessToken, childId, {
      tags: ['a', 'b', 'c', 'd', 'e', 'f'],
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject tags longer than 50 characters', async () => {
    const response = await createObservation(accessToken, childId, {
      tags: ['x'.repeat(51)],
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/observations`,
      payload: {
        dimension: 'academic',
        content: 'Test observation',
        sentiment: 'positive',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject if child does not belong to parent', async () => {
    // Register another parent
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other@example.com',
        password: 'SecurePass1',
      },
    });
    const otherToken = otherRes.json().accessToken;

    const response = await createObservation(otherToken, childId);

    expect(response.statusCode).toBe(404);
  });

  it('should mark ScoreCache as stale for the affected dimension', async () => {
    // Create a ScoreCache entry first
    await prisma.scoreCache.create({
      data: {
        childId,
        dimension: 'academic',
        score: 75,
        stale: false,
      },
    });

    await createObservation(accessToken, childId);

    const cache = await prisma.scoreCache.findFirst({
      where: { childId, dimension: 'academic' },
    });
    expect(cache!.stale).toBe(true);
  });

  it('should accept all valid dimensions', async () => {
    const dimensions = [
      'academic',
      'social_emotional',
      'behavioural',
      'aspirational',
      'islamic',
      'physical',
    ];

    for (const dimension of dimensions) {
      const response = await createObservation(accessToken, childId, {
        dimension,
      });
      expect(response.statusCode).toBe(201);
      expect(response.json().dimension).toBe(dimension);
    }
  });
});

describe('GET /api/children/:childId/observations', () => {
  beforeEach(async () => {
    // Create several observations
    await createObservation(accessToken, childId, {
      dimension: 'academic',
      content: 'First observation',
      sentiment: 'positive',
      observedAt: '2026-02-01',
    });
    await createObservation(accessToken, childId, {
      dimension: 'social_emotional',
      content: 'Second observation',
      sentiment: 'neutral',
      observedAt: '2026-02-05',
    });
    await createObservation(accessToken, childId, {
      dimension: 'academic',
      content: 'Third observation',
      sentiment: 'needs_attention',
      observedAt: '2026-02-10',
    });
  });

  it('should return a paginated list of observations', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(3);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.page).toBe(1);
  });

  it('should sort by observedAt DESC by default', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data[0].observedAt).toBe('2026-02-10');
    expect(body.data[1].observedAt).toBe('2026-02-05');
    expect(body.data[2].observedAt).toBe('2026-02-01');
  });

  it('should filter by dimension', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations?dimension=academic`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data).toHaveLength(2);
    body.data.forEach((obs: any) => {
      expect(obs.dimension).toBe('academic');
    });
  });

  it('should filter by sentiment', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations?sentiment=positive`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].sentiment).toBe('positive');
  });

  it('should filter by date range (from)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations?from=2026-02-05`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data).toHaveLength(2);
  });

  it('should filter by date range (to)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations?to=2026-02-05`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data).toHaveLength(2);
  });

  it('should filter by date range (from and to)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations?from=2026-02-03&to=2026-02-07`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].content).toBe('Second observation');
  });

  it('should support pagination with page and limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations?page=1&limit=2`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.totalPages).toBe(2);
    expect(body.pagination.hasMore).toBe(true);
  });

  it('should return page 2 correctly', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations?page=2&limit=2`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.hasMore).toBe(false);
  });

  it('should exclude soft-deleted observations', async () => {
    // Soft-delete the first observation
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const firstId = listRes.json().data[0].id;

    await prisma.observation.update({
      where: { id: firstId },
      data: { deletedAt: new Date() },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.json().data).toHaveLength(2);
    expect(response.json().pagination.total).toBe(2);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject if child does not belong to parent', async () => {
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other@example.com',
        password: 'SecurePass1',
      },
    });
    const otherToken = otherRes.json().accessToken;

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations`,
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('GET /api/children/:childId/observations/:id', () => {
  let observationId: string;

  beforeEach(async () => {
    const res = await createObservation(accessToken, childId, {
      tags: ['homework', 'math'],
    });
    observationId = res.json().id;
  });

  it('should return a single observation', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe(observationId);
    expect(body.childId).toBe(childId);
    expect(body.dimension).toBe('academic');
    expect(body.content).toBe(
      'Ahmad completed his math homework independently today'
    );
    expect(body.sentiment).toBe('positive');
    expect(body.tags).toEqual(['homework', 'math']);
  });

  it('should return 404 for non-existent observation', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations/nonexistent-id`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404 for soft-deleted observation', async () => {
    await prisma.observation.update({
      where: { id: observationId },
      data: { deletedAt: new Date() },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations/${observationId}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject if child does not belong to parent', async () => {
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other@example.com',
        password: 'SecurePass1',
      },
    });
    const otherToken = otherRes.json().accessToken;

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('PATCH /api/children/:childId/observations/:id', () => {
  let observationId: string;

  beforeEach(async () => {
    const res = await createObservation(accessToken, childId);
    observationId = res.json().id;
  });

  it('should update observation content', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: 'Updated observation content' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().content).toBe('Updated observation content');
  });

  it('should update observation sentiment', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { sentiment: 'needs_attention' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().sentiment).toBe('needs_attention');
  });

  it('should update observation tags', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { tags: ['updated', 'tags'] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().tags).toEqual(['updated', 'tags']);
  });

  it('should update observation observedAt', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { observedAt: '2026-01-20' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().observedAt).toBe('2026-01-20');
  });

  it('should mark ScoreCache as stale on update', async () => {
    await prisma.scoreCache.create({
      data: {
        childId,
        dimension: 'academic',
        score: 75,
        stale: false,
      },
    });

    await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: 'Updated content' },
    });

    const cache = await prisma.scoreCache.findFirst({
      where: { childId, dimension: 'academic' },
    });
    expect(cache!.stale).toBe(true);
  });

  it('should reject invalid content (too long)', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: 'x'.repeat(1001) },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject invalid sentiment', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { sentiment: 'invalid' },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should return 404 for non-existent observation', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/observations/nonexistent-id`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: 'Updated content' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404 for soft-deleted observation', async () => {
    await prisma.observation.update({
      where: { id: observationId },
      data: { deletedAt: new Date() },
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: 'Trying to update deleted' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/observations/${observationId}`,
      payload: { content: 'Updated' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject if child does not belong to parent', async () => {
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other@example.com',
        password: 'SecurePass1',
      },
    });
    const otherToken = otherRes.json().accessToken;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { content: 'Hacking attempt' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /api/children/:childId/observations/:id', () => {
  let observationId: string;

  beforeEach(async () => {
    const res = await createObservation(accessToken, childId);
    observationId = res.json().id;
  });

  it('should soft delete an observation and return 204', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(204);
  });

  it('should set deletedAt on the observation (soft delete)', async () => {
    await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const obs = await prisma.observation.findUnique({
      where: { id: observationId },
    });
    expect(obs).not.toBeNull();
    expect(obs!.deletedAt).not.toBeNull();
  });

  it('should NOT hard delete the observation', async () => {
    await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const obs = await prisma.observation.findUnique({
      where: { id: observationId },
    });
    expect(obs).not.toBeNull();
  });

  it('should mark ScoreCache as stale on delete', async () => {
    await prisma.scoreCache.create({
      data: {
        childId,
        dimension: 'academic',
        score: 75,
        stale: false,
      },
    });

    await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const cache = await prisma.scoreCache.findFirst({
      where: { childId, dimension: 'academic' },
    });
    expect(cache!.stale).toBe(true);
  });

  it('should return 404 for non-existent observation', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/observations/nonexistent-id`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404 for already soft-deleted observation', async () => {
    await prisma.observation.update({
      where: { id: observationId },
      data: { deletedAt: new Date() },
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/observations/${observationId}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject if child does not belong to parent', async () => {
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other@example.com',
        password: 'SecurePass1',
      },
    });
    const otherToken = otherRes.json().accessToken;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should exclude deleted observations from GET list after delete', async () => {
    await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/observations/${observationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const listRes = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(listRes.json().data).toHaveLength(0);
    expect(listRes.json().pagination.total).toBe(0);
  });
});
