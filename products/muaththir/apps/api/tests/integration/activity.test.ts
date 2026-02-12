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
  email: 'fatima-activity@example.com',
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

describe('GET /api/activity/:childId', () => {
  it('should return 401 for unauthenticated requests', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/activity/${childId}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return 404 if child does not belong to parent', async () => {
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other-activity@example.com',
        password: 'SecurePass1',
      },
    });
    const otherToken = otherRes.json().accessToken;

    const response = await app.inject({
      method: 'GET',
      url: `/api/activity/${childId}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return empty array when no activities exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/activity/${childId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toEqual([]);
  });

  it('should return observations as activity items', async () => {
    await prisma.observation.create({
      data: {
        childId,
        dimension: 'academic',
        content: 'Great math work today',
        sentiment: 'positive',
        observedAt: new Date('2026-02-10'),
        tags: [],
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/activity/${childId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe('observation');
    expect(body.data[0].title).toBe('Great math work today');
    expect(body.data[0].dimension).toBe('academic');
    expect(body.data[0].date).toBeDefined();
    expect(body.data[0].details).toBeDefined();
    expect(body.data[0].details.sentiment).toBe('positive');
  });

  it('should return milestones as activity items', async () => {
    const milestoneDef = await prisma.milestoneDefinition.create({
      data: {
        dimension: 'academic',
        ageBand: 'primary',
        title: 'Can count to 100',
        description: 'Child can count from 1 to 100',
        sortOrder: 1,
      },
    });

    await prisma.childMilestone.create({
      data: {
        childId,
        milestoneId: milestoneDef.id,
        achieved: true,
        achievedAt: new Date('2026-02-08'),
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/activity/${childId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe('milestone');
    expect(body.data[0].title).toBe('Can count to 100');
    expect(body.data[0].dimension).toBe('academic');
    expect(body.data[0].date).toBeDefined();
    expect(body.data[0].details).toBeDefined();
    expect(body.data[0].details.achieved).toBe(true);
  });

  it('should return goals as activity items', async () => {
    await prisma.goal.create({
      data: {
        childId,
        dimension: 'physical',
        title: 'Learn to swim',
        description: 'Complete beginner swimming lessons',
        status: 'active',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/activity/${childId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe('goal');
    expect(body.data[0].title).toBe('Learn to swim');
    expect(body.data[0].dimension).toBe('physical');
    expect(body.data[0].date).toBeDefined();
    expect(body.data[0].details).toBeDefined();
    expect(body.data[0].details.status).toBe('active');
  });

  it('should merge and sort activities by date descending', async () => {
    // Create activities with different dates
    await prisma.observation.create({
      data: {
        childId,
        dimension: 'academic',
        content: 'Oldest observation',
        sentiment: 'positive',
        observedAt: new Date('2026-02-01'),
        tags: [],
      },
    });

    await prisma.goal.create({
      data: {
        childId,
        dimension: 'physical',
        title: 'Middle goal',
        status: 'active',
        createdAt: new Date('2026-02-05'),
      },
    });

    const milestoneDef = await prisma.milestoneDefinition.create({
      data: {
        dimension: 'islamic',
        ageBand: 'primary',
        title: 'Newest milestone',
        description: 'Recent achievement',
        sortOrder: 1,
      },
    });

    await prisma.childMilestone.create({
      data: {
        childId,
        milestoneId: milestoneDef.id,
        achieved: true,
        achievedAt: new Date('2026-02-10'),
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/activity/${childId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(3);
    // Newest first
    expect(body.data[0].type).toBe('milestone');
    expect(body.data[0].title).toBe('Newest milestone');
    expect(body.data[1].type).toBe('goal');
    expect(body.data[1].title).toBe('Middle goal');
    expect(body.data[2].type).toBe('observation');
    expect(body.data[2].title).toBe('Oldest observation');
  });

  it('should limit results to 20 items', async () => {
    // Create 25 observations
    const promises = [];
    for (let i = 0; i < 25; i++) {
      promises.push(
        prisma.observation.create({
          data: {
            childId,
            dimension: 'academic',
            content: `Observation ${i + 1}`,
            sentiment: 'positive',
            observedAt: new Date(`2026-01-${String(i + 1).padStart(2, '0')}`),
            tags: [],
          },
        })
      );
    }
    await Promise.all(promises);

    const response = await app.inject({
      method: 'GET',
      url: `/api/activity/${childId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(20);
  });

  it('should exclude soft-deleted observations', async () => {
    await prisma.observation.create({
      data: {
        childId,
        dimension: 'academic',
        content: 'Visible observation',
        sentiment: 'positive',
        observedAt: new Date('2026-02-10'),
        tags: [],
      },
    });

    await prisma.observation.create({
      data: {
        childId,
        dimension: 'academic',
        content: 'Deleted observation',
        sentiment: 'neutral',
        observedAt: new Date('2026-02-09'),
        tags: [],
        deletedAt: new Date(),
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/activity/${childId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Visible observation');
  });

  it('should only include achieved milestones', async () => {
    const milestoneDef1 = await prisma.milestoneDefinition.create({
      data: {
        dimension: 'academic',
        ageBand: 'primary',
        title: 'Achieved milestone',
        description: 'Done',
        sortOrder: 1,
      },
    });

    const milestoneDef2 = await prisma.milestoneDefinition.create({
      data: {
        dimension: 'academic',
        ageBand: 'primary',
        title: 'Not achieved milestone',
        description: 'Not done',
        sortOrder: 2,
      },
    });

    await prisma.childMilestone.create({
      data: {
        childId,
        milestoneId: milestoneDef1.id,
        achieved: true,
        achievedAt: new Date('2026-02-05'),
      },
    });

    await prisma.childMilestone.create({
      data: {
        childId,
        milestoneId: milestoneDef2.id,
        achieved: false,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/activity/${childId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    const milestoneActivities = body.data.filter(
      (a: { type: string }) => a.type === 'milestone'
    );
    expect(milestoneActivities).toHaveLength(1);
    expect(milestoneActivities[0].title).toBe('Achieved milestone');
  });

  it('should include correct details for each activity type', async () => {
    await prisma.observation.create({
      data: {
        childId,
        dimension: 'social_emotional',
        content: 'Shared toys with friends',
        sentiment: 'positive',
        observedAt: new Date('2026-02-10'),
        tags: ['sharing'],
      },
    });

    const milestoneDef = await prisma.milestoneDefinition.create({
      data: {
        dimension: 'academic',
        ageBand: 'primary',
        title: 'Reads independently',
        description: 'Can read a book without help',
        sortOrder: 1,
      },
    });

    await prisma.childMilestone.create({
      data: {
        childId,
        milestoneId: milestoneDef.id,
        achieved: true,
        achievedAt: new Date('2026-02-09'),
      },
    });

    await prisma.goal.create({
      data: {
        childId,
        dimension: 'physical',
        title: 'Run 1km',
        description: 'Build stamina',
        targetDate: new Date('2026-06-01'),
        status: 'active',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/activity/${childId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(3);

    // Verify observation details
    const obs = body.data.find(
      (a: { type: string }) => a.type === 'observation'
    );
    expect(obs.details.sentiment).toBe('positive');
    expect(obs.details.tags).toEqual(['sharing']);

    // Verify milestone details
    const ms = body.data.find(
      (a: { type: string }) => a.type === 'milestone'
    );
    expect(ms.details.achieved).toBe(true);
    expect(ms.details.description).toBe('Can read a book without help');

    // Verify goal details
    const goal = body.data.find(
      (a: { type: string }) => a.type === 'goal'
    );
    expect(goal.details.status).toBe('active');
    expect(goal.details.description).toBe('Build stamina');
  });
});
