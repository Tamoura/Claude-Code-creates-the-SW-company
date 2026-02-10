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
  name: 'Dashboard Parent',
  email: 'dash-parent@test.com',
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
  cId: string,
  dimension: string,
  sentiment: string
) {
  const res = await app.inject({
    method: 'POST',
    url: `/api/children/${cId}/observations`,
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

describe('GET /api/dashboard/:childId', () => {
  let authToken: string;
  let childId: string;

  beforeEach(async () => {
    authToken = await registerAndGetToken();
    const child = await createChild(authToken, 'Ahmad', 7);
    childId = child.id;
  });

  it('should require authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('should return 404 for non-existent child', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dashboard/nonexistent-id',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for child belonging to another parent', async () => {
    const otherToken = await registerAndGetToken({
      email: 'other@test.com',
      name: 'Other Parent',
    });
    const otherChild = await createChild(otherToken, 'Other Child', 8);

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${otherChild.id}`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return all 6 dimensions with zero scores when no data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.childId).toBe(childId);
    expect(body.childName).toBe('Ahmad');
    expect(body.ageBand).toBe('primary'); // Age 7
    expect(body.overallScore).toBe(0);
    expect(body.dimensions).toHaveLength(6);
    expect(body.calculatedAt).toBeDefined();

    const dimensions = body.dimensions.map((d: any) => d.dimension);
    expect(dimensions).toEqual([
      'academic',
      'social_emotional',
      'behavioural',
      'aspirational',
      'islamic',
      'physical',
    ]);

    for (const dim of body.dimensions) {
      expect(dim.score).toBe(0);
      expect(dim.factors).toEqual({
        observation: 0,
        milestone: 0,
        sentiment: 0,
      });
      expect(dim.observationCount).toBe(0);
    }
  });

  it('should calculate observation_factor correctly (capped at 10)', async () => {
    for (let i = 0; i < 5; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const academic = body.dimensions.find(
      (d: any) => d.dimension === 'academic'
    );

    // observation_factor = min(5, 10) / 10 * 100 = 50
    expect(academic.factors.observation).toBe(50);
    expect(academic.observationCount).toBe(5);
  });

  it('should cap observation_factor at 100 for 10+ observations', async () => {
    for (let i = 0; i < 12; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const academic = body.dimensions.find(
      (d: any) => d.dimension === 'academic'
    );

    // observation_factor = min(12, 10) / 10 * 100 = 100
    expect(academic.factors.observation).toBe(100);
    expect(academic.observationCount).toBe(12);
  });

  it('should calculate sentiment_factor from positive ratio', async () => {
    // 3 positive, 2 neutral = 60% positive
    await createObservation(authToken, childId, 'academic', 'positive');
    await createObservation(authToken, childId, 'academic', 'positive');
    await createObservation(authToken, childId, 'academic', 'positive');
    await createObservation(authToken, childId, 'academic', 'neutral');
    await createObservation(authToken, childId, 'academic', 'neutral');

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const academic = body.dimensions.find(
      (d: any) => d.dimension === 'academic'
    );

    // sentiment_factor = 3/5 * 100 = 60
    expect(academic.factors.sentiment).toBe(60);
  });

  it('should calculate milestone_factor from age-band milestones', async () => {
    // Seed milestones for academic + primary age band
    const milestones = [];
    for (let i = 1; i <= 5; i++) {
      milestones.push(
        await prisma.milestoneDefinition.create({
          data: {
            dimension: 'academic',
            ageBand: 'primary',
            title: `Academic milestone ${i}`,
            description: `Description for milestone ${i}`,
            sortOrder: i,
          },
        })
      );
    }

    // Achieve 3 of 5
    for (let i = 0; i < 3; i++) {
      await prisma.childMilestone.create({
        data: {
          childId,
          milestoneId: milestones[i].id,
          achieved: true,
          achievedAt: new Date(),
        },
      });
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const academic = body.dimensions.find(
      (d: any) => d.dimension === 'academic'
    );

    // milestone_factor = 3/5 * 100 = 60
    expect(academic.factors.milestone).toBe(60);
    expect(academic.milestoneProgress).toEqual({
      achieved: 3,
      total: 5,
    });
  });

  it('should calculate combined score with all factors', async () => {
    // Seed 10 milestones, achieve 5
    const milestones = [];
    for (let i = 1; i <= 10; i++) {
      milestones.push(
        await prisma.milestoneDefinition.create({
          data: {
            dimension: 'physical',
            ageBand: 'primary',
            title: `Physical milestone ${i}`,
            description: `Description ${i}`,
            sortOrder: i,
          },
        })
      );
    }

    for (let i = 0; i < 5; i++) {
      await prisma.childMilestone.create({
        data: {
          childId,
          milestoneId: milestones[i].id,
          achieved: true,
          achievedAt: new Date(),
        },
      });
    }

    // 8 positive + 2 needs_attention = 10 observations
    for (let i = 0; i < 8; i++) {
      await createObservation(authToken, childId, 'physical', 'positive');
    }
    for (let i = 0; i < 2; i++) {
      await createObservation(
        authToken,
        childId,
        'physical',
        'needs_attention'
      );
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const physical = body.dimensions.find(
      (d: any) => d.dimension === 'physical'
    );

    // observation_factor = min(10, 10) / 10 * 100 = 100
    // milestone_factor = 5/10 * 100 = 50
    // sentiment_factor = 8/10 * 100 = 80
    // score = (100 * 0.4) + (50 * 0.4) + (80 * 0.2) = 40 + 20 + 16 = 76
    expect(physical.factors.observation).toBe(100);
    expect(physical.factors.milestone).toBe(50);
    expect(physical.factors.sentiment).toBe(80);
    expect(physical.score).toBe(76);
  });

  it('should only count observations from last 30 days', async () => {
    // Create an observation from 60 days ago directly
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get parentId from the child
    const child = await prisma.child.findUnique({ where: { id: childId } });

    await prisma.observation.create({
      data: {
        childId,
        dimension: 'academic',
        content: 'Old observation',
        sentiment: 'positive',
        observedAt: sixtyDaysAgo,
      },
    });

    // Create 2 recent observations
    await createObservation(authToken, childId, 'academic', 'positive');
    await createObservation(authToken, childId, 'academic', 'neutral');

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const academic = body.dimensions.find(
      (d: any) => d.dimension === 'academic'
    );

    // Only 2 recent observations count
    expect(academic.observationCount).toBe(2);
    expect(academic.factors.observation).toBe(20);
    expect(academic.factors.sentiment).toBe(50);
  });

  it('should exclude soft-deleted observations from scoring', async () => {
    await createObservation(authToken, childId, 'academic', 'positive');
    await createObservation(authToken, childId, 'academic', 'positive');
    const toDelete = await createObservation(
      authToken,
      childId,
      'academic',
      'positive'
    );

    // Soft delete
    await prisma.observation.update({
      where: { id: toDelete.id },
      data: { deletedAt: new Date() },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const academic = body.dimensions.find(
      (d: any) => d.dimension === 'academic'
    );

    expect(academic.observationCount).toBe(2);
  });

  it('should only count milestones for the childs current age band', async () => {
    // Child is in primary age band (age 7)
    for (let i = 1; i <= 5; i++) {
      await prisma.milestoneDefinition.create({
        data: {
          dimension: 'islamic',
          ageBand: 'primary',
          title: `Primary islamic ${i}`,
          description: `Desc ${i}`,
          sortOrder: i,
        },
      });
    }
    for (let i = 1; i <= 5; i++) {
      await prisma.milestoneDefinition.create({
        data: {
          dimension: 'islamic',
          ageBand: 'secondary',
          title: `Secondary islamic ${i}`,
          description: `Desc ${i}`,
          sortOrder: i,
        },
      });
    }

    // Achieve all primary milestones
    const primaryMilestones = await prisma.milestoneDefinition.findMany({
      where: { dimension: 'islamic', ageBand: 'primary' },
    });

    for (const m of primaryMilestones) {
      await prisma.childMilestone.create({
        data: {
          childId,
          milestoneId: m.id,
          achieved: true,
          achievedAt: new Date(),
        },
      });
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const islamic = body.dimensions.find(
      (d: any) => d.dimension === 'islamic'
    );

    // Only primary milestones count: 5/5 = 100
    expect(islamic.factors.milestone).toBe(100);
    expect(islamic.milestoneProgress).toEqual({
      achieved: 5,
      total: 5,
    });
  });

  it('should calculate overallScore as average of all dimensions', async () => {
    // Add observations to 2 dimensions: 10 positive each
    for (let i = 0; i < 10; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }
    for (let i = 0; i < 10; i++) {
      await createObservation(authToken, childId, 'physical', 'positive');
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    // academic & physical: observation_factor=100, sentiment_factor=100
    // score = (100*0.4) + (0*0.4) + (100*0.2) = 60
    // Other 4 dimensions: 0
    // overall = (60 + 60 + 0 + 0 + 0 + 0) / 6 = 20
    expect(body.overallScore).toBe(20);
  });

  it('should use cached scores when not stale', async () => {
    // First call to populate cache
    await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    // Verify cache entries were created
    const cacheEntries = await prisma.scoreCache.findMany({
      where: { childId },
    });
    expect(cacheEntries).toHaveLength(6);
    expect(cacheEntries.every((c: any) => c.stale === false)).toBe(true);

    // Second call should use cache
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.dimensions).toHaveLength(6);
  });

  it('should recalculate stale dimensions', async () => {
    // First call to populate cache
    await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    // Add observations
    for (let i = 0; i < 5; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }

    // Mark academic as stale
    await prisma.scoreCache.updateMany({
      where: { childId, dimension: 'academic' },
      data: { stale: true },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const academic = body.dimensions.find(
      (d: any) => d.dimension === 'academic'
    );

    // Should reflect the new observations
    expect(academic.observationCount).toBe(5);
    expect(academic.factors.observation).toBe(50);

    // Verify cache is now fresh
    const cache = await prisma.scoreCache.findFirst({
      where: { childId, dimension: 'academic' },
    });
    expect(cache!.stale).toBe(false);
    expect(cache!.score).toBeGreaterThan(0);
  });

  it('should handle child with out-of-range age band (no milestones)', async () => {
    // Create a child who is 2 years old (out of range)
    const child = await prisma.child.findUnique({ where: { id: childId } });
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const youngChild = await prisma.child.create({
      data: {
        parentId: child!.parentId,
        name: 'Young Child',
        dateOfBirth: twoYearsAgo,
      },
    });

    // Add observation directly
    await prisma.observation.create({
      data: {
        childId: youngChild.id,
        dimension: 'physical',
        content: 'Crawling well',
        sentiment: 'positive',
        observedAt: new Date(),
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${youngChild.id}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.ageBand).toBeNull();

    const physical = body.dimensions.find(
      (d: any) => d.dimension === 'physical'
    );

    // observation_factor = min(1, 10) / 10 * 100 = 10
    // milestone_factor = 0 (no age band)
    // sentiment_factor = 1/1 * 100 = 100
    // score = (10 * 0.4) + (0 * 0.4) + (100 * 0.2) = 4 + 0 + 20 = 24
    expect(physical.factors.observation).toBe(10);
    expect(physical.factors.milestone).toBe(0);
    expect(physical.factors.sentiment).toBe(100);
    expect(physical.score).toBe(24);
    expect(physical.milestoneProgress).toEqual({ achieved: 0, total: 0 });
  });

  it('should return correct response structure', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body).toHaveProperty('childId');
    expect(body).toHaveProperty('childName');
    expect(body).toHaveProperty('ageBand');
    expect(body).toHaveProperty('overallScore');
    expect(body).toHaveProperty('dimensions');
    expect(body).toHaveProperty('calculatedAt');

    const dim = body.dimensions[0];
    expect(dim).toHaveProperty('dimension');
    expect(dim).toHaveProperty('score');
    expect(dim).toHaveProperty('factors');
    expect(dim.factors).toHaveProperty('observation');
    expect(dim.factors).toHaveProperty('milestone');
    expect(dim.factors).toHaveProperty('sentiment');
    expect(dim).toHaveProperty('observationCount');
    expect(dim).toHaveProperty('milestoneProgress');
    expect(dim.milestoneProgress).toHaveProperty('achieved');
    expect(dim.milestoneProgress).toHaveProperty('total');
  });

  it('should handle needs_attention sentiment correctly in scoring', async () => {
    for (let i = 0; i < 4; i++) {
      await createObservation(
        authToken,
        childId,
        'behavioural',
        'needs_attention'
      );
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const behavioural = body.dimensions.find(
      (d: any) => d.dimension === 'behavioural'
    );

    // observation_factor = min(4,10)/10*100 = 40
    // sentiment_factor = 0/4*100 = 0
    // score = (40*0.4) + (0*0.4) + (0*0.2) = 16
    expect(behavioural.factors.sentiment).toBe(0);
    expect(behavioural.score).toBe(16);
  });

  it('should score dimensions independently', async () => {
    for (let i = 0; i < 5; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const academic = body.dimensions.find(
      (d: any) => d.dimension === 'academic'
    );
    const physical = body.dimensions.find(
      (d: any) => d.dimension === 'physical'
    );

    expect(academic.score).toBeGreaterThan(0);
    expect(physical.score).toBe(0);
  });
});

describe('GET /api/dashboard/:childId/recent', () => {
  let authToken: string;
  let childId: string;

  beforeEach(async () => {
    authToken = await registerAndGetToken();
    const child = await createChild(authToken, 'Ahmad', 7);
    childId = child.id;
  });

  it('should require authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/recent`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('should return 404 for non-existent child', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dashboard/nonexistent-id/recent',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return empty array when no observations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/recent`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });

  it('should return at most 5 recent observations', async () => {
    for (let i = 0; i < 7; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/recent`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(5);
  });

  it('should exclude soft-deleted observations', async () => {
    const obs = await createObservation(authToken, childId, 'academic', 'positive');
    await createObservation(authToken, childId, 'physical', 'neutral');
    await prisma.observation.update({
      where: { id: obs.id },
      data: { deletedAt: new Date() },
    });
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/recent`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
  });
});

describe('GET /api/dashboard/:childId/milestones-due', () => {
  let authToken: string;
  let childId: string;

  beforeEach(async () => {
    authToken = await registerAndGetToken();
    const child = await createChild(authToken, 'Ahmad', 7);
    childId = child.id;
  });

  it('should require authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/milestones-due`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('should return 404 for non-existent child', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dashboard/nonexistent-id/milestones-due',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return empty array when no milestones', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/milestones-due`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });

  it('should return at most 3 unachieved milestones', async () => {
    for (let i = 1; i <= 5; i++) {
      await prisma.milestoneDefinition.create({
        data: {
          dimension: 'academic',
          ageBand: 'primary',
          title: `Academic milestone ${i}`,
          description: `Desc ${i}`,
          sortOrder: i,
        },
      });
    }
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/milestones-due`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(3);
  });

  it('should exclude achieved milestones', async () => {
    const milestones = [];
    for (let i = 1; i <= 4; i++) {
      milestones.push(
        await prisma.milestoneDefinition.create({
          data: {
            dimension: 'academic',
            ageBand: 'primary',
            title: `Academic milestone ${i}`,
            description: `Desc ${i}`,
            sortOrder: i,
          },
        })
      );
    }
    for (let i = 0; i < 2; i++) {
      await prisma.childMilestone.create({
        data: {
          childId,
          milestoneId: milestones[i].id,
          achieved: true,
          achievedAt: new Date(),
        },
      });
    }
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/milestones-due`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data).toHaveLength(2);
    expect(data[0].title).toBe('Academic milestone 3');
  });
});
