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

describe('Query optimization: observations pagination', () => {
  it('should paginate observations correctly with many records', async () => {
    // Create 25 observations
    for (let i = 0; i < 25; i++) {
      await prisma.observation.create({
        data: {
          childId,
          dimension: 'academic',
          content: `Observation ${i + 1}`,
          sentiment: 'positive',
          observedAt: new Date(`2026-02-${String(Math.min(i + 1, 28)).padStart(2, '0')}`),
        },
      });
    }

    // Default pagination should return 20 items
    const page1 = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(page1.statusCode).toBe(200);
    const body1 = page1.json();
    expect(body1.data).toHaveLength(20);
    expect(body1.pagination.total).toBe(25);
    expect(body1.pagination.totalPages).toBe(2);
    expect(body1.pagination.hasMore).toBe(true);

    // Page 2 should return remaining 5
    const page2 = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations?page=2`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(page2.statusCode).toBe(200);
    const body2 = page2.json();
    expect(body2.data).toHaveLength(5);
    expect(body2.pagination.hasMore).toBe(false);
  });

  it('should respect custom limit parameter', async () => {
    for (let i = 0; i < 10; i++) {
      await prisma.observation.create({
        data: {
          childId,
          dimension: 'academic',
          content: `Observation ${i + 1}`,
          sentiment: 'positive',
          observedAt: new Date('2026-02-01'),
        },
      });
    }

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/observations?limit=5`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(5);
    expect(body.pagination.limit).toBe(5);
    expect(body.pagination.total).toBe(10);
  });
});

describe('Query optimization: goals pagination', () => {
  it('should paginate goals correctly', async () => {
    // Create 25 goals
    for (let i = 0; i < 25; i++) {
      await prisma.goal.create({
        data: {
          childId,
          dimension: 'academic',
          title: `Goal ${i + 1}`,
          status: 'active',
        },
      });
    }

    const page1 = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(page1.statusCode).toBe(200);
    const body1 = page1.json();
    expect(body1.data).toHaveLength(20);
    expect(body1.pagination.total).toBe(25);
    expect(body1.pagination.hasMore).toBe(true);

    const page2 = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals?page=2`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(page2.statusCode).toBe(200);
    expect(page2.json().data).toHaveLength(5);
    expect(page2.json().pagination.hasMore).toBe(false);
  });

  it('should filter goals by dimension in a single query', async () => {
    await prisma.goal.createMany({
      data: [
        { childId, dimension: 'academic', title: 'Academic Goal', status: 'active' },
        { childId, dimension: 'physical', title: 'Physical Goal', status: 'active' },
        { childId, dimension: 'academic', title: 'Academic Goal 2', status: 'active' },
      ],
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/goals?dimension=academic`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
    body.data.forEach((goal: any) => {
      expect(goal.dimension).toBe('academic');
    });
  });
});

describe('Query optimization: milestones batch loading', () => {
  it('should load milestone definitions with child progress in a single query', async () => {
    // Create milestone definitions
    const milestone = await prisma.milestoneDefinition.create({
      data: {
        dimension: 'academic',
        ageBand: 'primary',
        title: 'Test Milestone',
        description: 'Test description',
        sortOrder: 1,
      },
    });

    // Mark it as achieved
    await prisma.childMilestone.create({
      data: {
        childId,
        milestoneId: milestone.id,
        achieved: true,
        achievedAt: new Date(),
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/milestones?dimension=academic`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    // The response includes child's progress (achieved status)
    // in the same response — no separate query needed
    expect(body.data[0].achieved).toBe(true);
    expect(body.data[0].achievedAt).toBeDefined();
  });
});

describe('Query optimization: children list batch loading', () => {
  it('should include observation count and milestone progress in single query', async () => {
    // Create observations
    for (let i = 0; i < 5; i++) {
      await prisma.observation.create({
        data: {
          childId,
          dimension: 'academic',
          content: `Observation ${i + 1}`,
          sentiment: 'positive',
          observedAt: new Date('2026-02-01'),
        },
      });
    }

    // Soft-delete one observation
    const obs = await prisma.observation.findFirst({ where: { childId } });
    await prisma.observation.update({
      where: { id: obs!.id },
      data: { deletedAt: new Date() },
    });

    // Create milestone definition and mark as achieved
    const milestone = await prisma.milestoneDefinition.create({
      data: {
        dimension: 'academic',
        ageBand: 'primary',
        title: 'Test Milestone',
        description: 'Test description',
        sortOrder: 1,
      },
    });
    await prisma.childMilestone.create({
      data: {
        childId,
        milestoneId: milestone.id,
        achieved: true,
        achievedAt: new Date(),
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/children',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    const child = body.data[0];

    // Observation count excludes soft-deleted
    expect(child.observationCount).toBe(4);
    // Milestone progress included in same response
    expect(child.milestoneProgress.total).toBe(1);
    expect(child.milestoneProgress.achieved).toBe(1);
  });
});
