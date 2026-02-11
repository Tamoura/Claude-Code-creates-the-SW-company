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
  email: 'fatima-goals@example.com',
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

async function createGoal(
  token: string,
  cId: string,
  overrides: Record<string, unknown> = {}
) {
  return app.inject({
    method: 'POST',
    url: `/api/children/${cId}/goals`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      dimension: 'academic',
      title: 'Complete multiplication tables',
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
  childId = await createChild();
});

describe('POST /api/children/:childId/goals', () => {
  it('should create a goal and return 201', async () => {
    const response = await createGoal(accessToken, childId);

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.childId).toBe(childId);
    expect(body.dimension).toBe('academic');
    expect(body.title).toBe('Complete multiplication tables');
    expect(body.status).toBe('active');
    expect(body.description).toBeNull();
    expect(body.targetDate).toBeNull();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it('should create a goal with optional fields', async () => {
    const response = await createGoal(accessToken, childId, {
      description: 'Master 1-12 multiplication tables by end of term',
      targetDate: '2026-06-30',
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.description).toBe(
      'Master 1-12 multiplication tables by end of term'
    );
    expect(body.targetDate).toBe('2026-06-30');
  });

  it('should reject missing title', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/goals`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        dimension: 'academic',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject empty title', async () => {
    const response = await createGoal(accessToken, childId, {
      title: '',
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject title longer than 200 characters', async () => {
    const response = await createGoal(accessToken, childId, {
      title: 'x'.repeat(201),
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject description longer than 500 characters', async () => {
    const response = await createGoal(accessToken, childId, {
      description: 'x'.repeat(501),
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject missing dimension', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/goals`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        title: 'Some goal',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject invalid dimension', async () => {
    const response = await createGoal(accessToken, childId, {
      dimension: 'invalid_dimension',
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject invalid targetDate format', async () => {
    const response = await createGoal(accessToken, childId, {
      targetDate: 'not-a-date',
    });

    expect(response.statusCode).toBe(422);
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
      const response = await createGoal(accessToken, childId, {
        dimension,
        title: `Goal for ${dimension}`,
      });
      expect(response.statusCode).toBe(201);
      expect(response.json().dimension).toBe(dimension);
    }
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/goals`,
      payload: {
        dimension: 'academic',
        title: 'Test goal',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject if child does not belong to parent', async () => {
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other-goals@example.com',
        password: 'SecurePass1',
      },
    });
    const otherToken = otherRes.json().accessToken;

    const response = await createGoal(otherToken, childId);

    expect(response.statusCode).toBe(404);
  });
});

describe('GET /api/children/:childId/goals', () => {
  beforeEach(async () => {
    // Create goals via Prisma directly to set different statuses
    await prisma.goal.create({
      data: {
        childId,
        dimension: 'academic',
        title: 'First goal',
        status: 'active',
      },
    });
    // Small delay to ensure distinct createdAt timestamps
    await new Promise((r) => setTimeout(r, 10));
    await prisma.goal.create({
      data: {
        childId,
        dimension: 'social_emotional',
        title: 'Second goal',
        status: 'completed',
      },
    });
    await new Promise((r) => setTimeout(r, 10));
    await prisma.goal.create({
      data: {
        childId,
        dimension: 'academic',
        title: 'Third goal',
        status: 'paused',
      },
    });
  });

  it('should return a paginated list of goals', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(3);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.page).toBe(1);
  });

  it('should sort by createdAt DESC by default', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data[0].title).toBe('Third goal');
    expect(body.data[1].title).toBe('Second goal');
    expect(body.data[2].title).toBe('First goal');
  });

  it('should filter by dimension', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals?dimension=academic`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data).toHaveLength(2);
    body.data.forEach((goal: any) => {
      expect(goal.dimension).toBe('academic');
    });
  });

  it('should filter by status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals?status=active`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe('active');
  });

  it('should filter by both dimension and status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals?dimension=academic&status=paused`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Third goal');
    expect(body.data[0].dimension).toBe('academic');
    expect(body.data[0].status).toBe('paused');
  });

  it('should support pagination with page and limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals?page=1&limit=2`,
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
      url: `/api/children/${childId}/goals?page=2&limit=2`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.hasMore).toBe(false);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject if child does not belong to parent', async () => {
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other-goals@example.com',
        password: 'SecurePass1',
      },
    });
    const otherToken = otherRes.json().accessToken;

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals`,
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('GET /api/children/:childId/goals/:goalId', () => {
  let goalId: string;

  beforeEach(async () => {
    const res = await createGoal(accessToken, childId, {
      description: 'A detailed description',
      targetDate: '2026-06-30',
    });
    goalId = res.json().id;
  });

  it('should return a single goal', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe(goalId);
    expect(body.childId).toBe(childId);
    expect(body.dimension).toBe('academic');
    expect(body.title).toBe('Complete multiplication tables');
    expect(body.description).toBe('A detailed description');
    expect(body.targetDate).toBe('2026-06-30');
    expect(body.status).toBe('active');
  });

  it('should return 404 for non-existent goal', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals/nonexistent-id`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals/${goalId}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject if child does not belong to parent', async () => {
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other-goals@example.com',
        password: 'SecurePass1',
      },
    });
    const otherToken = otherRes.json().accessToken;

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('PATCH /api/children/:childId/goals/:goalId', () => {
  let goalId: string;

  beforeEach(async () => {
    const res = await createGoal(accessToken, childId);
    goalId = res.json().id;
  });

  it('should update goal title', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Updated goal title' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().title).toBe('Updated goal title');
  });

  it('should update goal description', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { description: 'New description' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().description).toBe('New description');
  });

  it('should update goal targetDate', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { targetDate: '2026-12-31' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().targetDate).toBe('2026-12-31');
  });

  it('should update goal status', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { status: 'completed' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('completed');
  });

  it('should update goal dimension', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { dimension: 'physical' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().dimension).toBe('physical');
  });

  it('should update multiple fields at once', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        title: 'Multi-update title',
        status: 'paused',
        description: 'Updated description',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.title).toBe('Multi-update title');
    expect(body.status).toBe('paused');
    expect(body.description).toBe('Updated description');
  });

  it('should reject title longer than 200 characters', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'x'.repeat(201) },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject description longer than 500 characters', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { description: 'x'.repeat(501) },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject invalid status', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { status: 'invalid_status' },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject invalid dimension', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { dimension: 'invalid' },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject invalid targetDate format', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { targetDate: 'not-a-date' },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should return 404 for non-existent goal', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/nonexistent-id`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Updated title' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      payload: { title: 'Updated' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject if child does not belong to parent', async () => {
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other-goals@example.com',
        password: 'SecurePass1',
      },
    });
    const otherToken = otherRes.json().accessToken;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { title: 'Hacking attempt' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /api/children/:childId/goals/:goalId', () => {
  let goalId: string;

  beforeEach(async () => {
    const res = await createGoal(accessToken, childId);
    goalId = res.json().id;
  });

  it('should hard delete a goal and return 204', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(204);
  });

  it('should actually remove the goal from the database', async () => {
    await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });
    expect(goal).toBeNull();
  });

  it('should return 404 for non-existent goal', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/goals/nonexistent-id`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/goals/${goalId}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject if child does not belong to parent', async () => {
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other-goals@example.com',
        password: 'SecurePass1',
      },
    });
    const otherToken = otherRes.json().accessToken;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should exclude deleted goals from GET list after delete', async () => {
    await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}/goals/${goalId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const listRes = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(listRes.json().data).toHaveLength(0);
    expect(listRes.json().pagination.total).toBe(0);
  });
});
