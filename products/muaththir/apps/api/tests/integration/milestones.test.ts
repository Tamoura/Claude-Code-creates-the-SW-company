import { FastifyInstance } from 'fastify';
import {
  setupTestDb,
  cleanDb,
  closeDb,
  createTestApp,
  prisma,
} from '../helpers/build-app';

let app: FastifyInstance;
let parentId: string;

const validRegistration = {
  name: 'Fatima Ahmed',
  email: 'fatima@example.com',
  password: 'SecurePass1',
};

async function registerAndGetToken(
  name = validRegistration.name,
  email = validRegistration.email,
  password = validRegistration.password
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name, email, password },
  });
  parentId = res.json().user.id;
  return res.json().accessToken;
}

async function createChildViaDb(
  pId: string,
  name = 'Yusuf',
  dateOfBirth = '2021-06-15'
): Promise<string> {
  const child = await prisma.child.create({
    data: {
      parentId: pId,
      name,
      dateOfBirth: new Date(dateOfBirth),
    },
  });
  return child.id;
}

async function seedTestMilestones(count = 10): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    const m = await prisma.milestoneDefinition.create({
      data: {
        dimension: 'academic',
        ageBand: 'early_years',
        title: `Test milestone ${i}`,
        description: `Description for test milestone ${i}`,
        guidance: `Guidance for test milestone ${i}`,
        sortOrder: i,
      },
    });
    ids.push(m.id);
  }
  return ids;
}

async function seedDiverseMilestones(): Promise<void> {
  const dimensions = [
    'academic',
    'social_emotional',
    'behavioural',
  ] as const;
  const ageBands = ['early_years', 'primary'] as const;

  for (const dimension of dimensions) {
    for (const ageBand of ageBands) {
      for (let i = 1; i <= 3; i++) {
        await prisma.milestoneDefinition.create({
          data: {
            dimension,
            ageBand,
            title: `${dimension} ${ageBand} milestone ${i}`,
            description: `Description for ${dimension} ${ageBand} ${i}`,
            sortOrder: i,
          },
        });
      }
    }
  }
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

// =============================================
// GET /api/milestones — List milestone definitions
// =============================================

describe('GET /api/milestones', () => {
  it('should return 200 with empty list when no milestones exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/milestones',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it('should return milestone definitions without auth', async () => {
    await seedTestMilestones(3);

    const res = await app.inject({
      method: 'GET',
      url: '/api/milestones',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(3);
    expect(body.data[0]).toHaveProperty('id');
    expect(body.data[0]).toHaveProperty('dimension', 'academic');
    expect(body.data[0]).toHaveProperty('ageBand', 'early_years');
    expect(body.data[0]).toHaveProperty('title');
    expect(body.data[0]).toHaveProperty('description');
    expect(body.data[0]).toHaveProperty('guidance');
    expect(body.data[0]).toHaveProperty('sortOrder');
  });

  it('should return milestones ordered by sortOrder', async () => {
    await seedTestMilestones(5);

    const res = await app.inject({
      method: 'GET',
      url: '/api/milestones',
    });

    const body = res.json();
    const sortOrders = body.data.map((m: any) => m.sortOrder);
    expect(sortOrders).toEqual([1, 2, 3, 4, 5]);
  });

  it('should filter by dimension', async () => {
    await seedDiverseMilestones();

    const res = await app.inject({
      method: 'GET',
      url: '/api/milestones?dimension=academic',
    });

    const body = res.json();
    expect(body.data.length).toBe(6); // 2 age bands x 3 milestones
    expect(body.data.every((m: any) => m.dimension === 'academic')).toBe(true);
  });

  it('should filter by ageBand', async () => {
    await seedDiverseMilestones();

    const res = await app.inject({
      method: 'GET',
      url: '/api/milestones?ageBand=primary',
    });

    const body = res.json();
    expect(body.data.length).toBe(9); // 3 dimensions x 3 milestones
    expect(body.data.every((m: any) => m.ageBand === 'primary')).toBe(true);
  });

  it('should filter by both dimension and ageBand', async () => {
    await seedDiverseMilestones();

    const res = await app.inject({
      method: 'GET',
      url: '/api/milestones?dimension=behavioural&ageBand=early_years',
    });

    const body = res.json();
    expect(body.data.length).toBe(3);
    expect(
      body.data.every(
        (m: any) =>
          m.dimension === 'behavioural' && m.ageBand === 'early_years'
      )
    ).toBe(true);
  });

  it('should reject invalid dimension with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/milestones?dimension=invalid_dim',
    });

    expect(res.statusCode).toBe(400);
  });

  it('should reject invalid ageBand with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/milestones?ageBand=toddler',
    });

    expect(res.statusCode).toBe(400);
  });

  it('should support pagination', async () => {
    await seedTestMilestones(10);

    const res = await app.inject({
      method: 'GET',
      url: '/api/milestones?page=1&limit=3',
    });

    const body = res.json();
    expect(body.data).toHaveLength(3);
    expect(body.pagination.total).toBe(10);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(3);
    expect(body.pagination.totalPages).toBe(4);
    expect(body.pagination.hasMore).toBe(true);
  });

  it('should return second page correctly', async () => {
    await seedTestMilestones(5);

    const res = await app.inject({
      method: 'GET',
      url: '/api/milestones?page=2&limit=3',
    });

    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.hasMore).toBe(false);
  });
});

// =============================================
// GET /api/children/:childId/milestones
// =============================================

describe('GET /api/children/:childId/milestones', () => {
  it('should require authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/children/some-id/milestones',
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 404 for non-existent child', async () => {
    const token = await registerAndGetToken();

    const res = await app.inject({
      method: 'GET',
      url: '/api/children/nonexistent-id/milestones',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for child belonging to another parent', async () => {
    const token1 = await registerAndGetToken('Parent1', 'parent1@example.com');
    const parent1Id = parentId;
    const token2 = await registerAndGetToken('Parent2', 'parent2@example.com');
    const childId = await createChildViaDb(parent1Id);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/milestones`,
      headers: { authorization: `Bearer ${token2}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should return milestone progress with achieved=false for untracked milestones', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    await seedTestMilestones(3);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/milestones`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(3);
    expect(body.data[0]).toHaveProperty('achieved', false);
    expect(body.data[0]).toHaveProperty('achievedAt', null);
    expect(body.data[0]).toHaveProperty('title');
    expect(body.data[0]).toHaveProperty('dimension');
  });

  it('should reflect achieved milestones correctly', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(3);

    // Mark first milestone as achieved
    await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/milestones`,
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json();
    const achieved = body.data.find((m: any) => m.id === milestoneIds[0]);
    const notAchieved = body.data.find((m: any) => m.id === milestoneIds[1]);

    expect(achieved.achieved).toBe(true);
    expect(achieved.achievedAt).toBeDefined();
    expect(achieved.achievedAt).not.toBeNull();
    expect(notAchieved.achieved).toBe(false);
    expect(notAchieved.achievedAt).toBeNull();
  });

  it('should filter by dimension', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    await seedDiverseMilestones();

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/milestones?dimension=academic`,
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json();
    expect(body.data.every((m: any) => m.dimension === 'academic')).toBe(true);
  });

  it('should filter by ageBand', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    await seedDiverseMilestones();

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/milestones?ageBand=early_years`,
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json();
    expect(
      body.data.every((m: any) => m.ageBand === 'early_years')
    ).toBe(true);
  });

  it('should support pagination', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    await seedTestMilestones(10);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/milestones?page=1&limit=4`,
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json();
    expect(body.data).toHaveLength(4);
    expect(body.pagination.total).toBe(10);
    expect(body.pagination.hasMore).toBe(true);
  });

  it('should not create ChildMilestone rows for untracked milestones (lazy row creation)', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    await seedTestMilestones(5);

    // Just reading milestone progress should NOT create ChildMilestone rows
    await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/milestones`,
      headers: { authorization: `Bearer ${token}` },
    });

    const childMilestoneCount = await prisma.childMilestone.count({
      where: { childId },
    });
    expect(childMilestoneCount).toBe(0);
  });
});

// =============================================
// PATCH /api/children/:childId/milestones/:milestoneId
// =============================================

describe('PATCH /api/children/:childId/milestones/:milestoneId', () => {
  it('should require authentication', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/children/some-id/milestones/some-milestone-id',
      payload: { achieved: true },
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 404 for non-existent child', async () => {
    const token = await registerAndGetToken();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/children/nonexistent-id/milestones/some-milestone-id',
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for child belonging to another parent', async () => {
    const token1 = await registerAndGetToken('Parent1', 'parent1@example.com');
    const parent1Id = parentId;
    const token2 = await registerAndGetToken('Parent2', 'parent2@example.com');
    const childId = await createChildViaDb(parent1Id);
    const milestoneIds = await seedTestMilestones(1);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token2}` },
      payload: { achieved: true },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for non-existent milestone', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/nonexistent-milestone-id`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should mark a milestone as achieved', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.achieved).toBe(true);
    expect(body.achievedAt).toBeDefined();
    expect(body.achievedAt).not.toBeNull();
    expect(body.title).toBe('Test milestone 1');
    expect(body.dimension).toBe('academic');
    expect(body.ageBand).toBe('early_years');
  });

  it('should unmark a milestone', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    // First, mark as achieved
    await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    // Then, unmark
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: false },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.achieved).toBe(false);
    expect(body.achievedAt).toBeNull();
  });

  it('should maintain achievedHistory on toggle', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    // Mark as achieved
    await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    // Unmark
    await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: false },
    });

    // Mark again
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    const body = res.json();
    expect(body.achievedHistory).toHaveLength(3);
    expect(body.achievedHistory[0].type).toBe('achieved');
    expect(body.achievedHistory[1].type).toBe('unmarked');
    expect(body.achievedHistory[2].type).toBe('achieved');
    expect(body.achievedHistory[0].at).toBeDefined();
    expect(body.achievedHistory[1].at).toBeDefined();
    expect(body.achievedHistory[2].at).toBeDefined();
  });

  it('should create ChildMilestone record on first toggle', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    const countBefore = await prisma.childMilestone.count({
      where: { childId },
    });
    expect(countBefore).toBe(0);

    await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    const countAfter = await prisma.childMilestone.count({
      where: { childId },
    });
    expect(countAfter).toBe(1);
  });

  it('should mark ScoreCache as stale for the milestone dimension', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    const scoreCache = await prisma.scoreCache.findUnique({
      where: {
        childId_dimension: {
          childId,
          dimension: 'academic',
        },
      },
    });

    expect(scoreCache).not.toBeNull();
    expect(scoreCache!.stale).toBe(true);
  });

  it('should reject missing achieved field with 422', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(422);
  });

  it('should reject non-boolean achieved value with 422', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: 'yes' },
    });

    expect(res.statusCode).toBe(422);
  });

  it('should handle marking achieved=false when no prior record exists', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    // Toggle to false without having toggled to true first
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: false },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.achieved).toBe(false);
    expect(body.achievedAt).toBeNull();
    expect(body.achievedHistory).toHaveLength(1);
    expect(body.achievedHistory[0].type).toBe('unmarked');
  });

  it('should return full milestone definition fields in response', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaDb(parentId);
    const milestoneIds = await seedTestMilestones(1);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}/milestones/${milestoneIds[0]}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { achieved: true },
    });

    const body = res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('dimension');
    expect(body).toHaveProperty('ageBand');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('description');
    expect(body).toHaveProperty('guidance');
    expect(body).toHaveProperty('sortOrder');
    expect(body).toHaveProperty('achieved');
    expect(body).toHaveProperty('achievedAt');
    expect(body).toHaveProperty('achievedHistory');
  });
});
