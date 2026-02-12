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
  name: 'Reports Parent',
  email: 'reports-parent@test.com',
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
  name = 'Ahmad',
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
  sentiment: string,
  daysAgo = 0
) {
  const observedAt = new Date();
  observedAt.setDate(observedAt.getDate() - daysAgo);

  const res = await app.inject({
    method: 'POST',
    url: `/api/children/${childId}/observations`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      dimension,
      content: `Test observation for ${dimension}`,
      sentiment,
      observedAt: observedAt.toISOString().split('T')[0],
    },
  });
  return res.json();
}

async function createGoal(
  token: string,
  childId: string,
  dimension: string,
  status: string = 'active'
) {
  const res = await app.inject({
    method: 'POST',
    url: `/api/children/${childId}/goals`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      dimension,
      title: `${dimension} goal`,
      status,
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

describe('GET /api/children/:childId/reports/summary', () => {
  let authToken: string;
  let childId: string;

  beforeEach(async () => {
    authToken = await registerAndGetToken();
    const child = await createChild(authToken, 'Ahmad', 7);
    childId = child.id;
  });

  // --- Auth & Ownership ---

  it('should require authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('should return 404 for non-existent child', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/children/nonexistent-id/reports/summary',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for child belonging to another parent', async () => {
    const otherToken = await registerAndGetToken({
      email: 'other-reports@test.com',
      name: 'Other Parent',
    });
    const otherChild = await createChild(otherToken, 'Other Child', 8);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${otherChild.id}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  // --- Response Structure ---

  it('should return correct response structure', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body).toHaveProperty('childId', childId);
    expect(body).toHaveProperty('childName', 'Ahmad');
    expect(body).toHaveProperty('ageBand', 'primary');
    expect(body).toHaveProperty('generatedAt');
    expect(body).toHaveProperty('dateRange');
    expect(body.dateRange).toHaveProperty('from');
    expect(body.dateRange).toHaveProperty('to');
    expect(body).toHaveProperty('overallScore');
    expect(body).toHaveProperty('dimensions');
    expect(body).toHaveProperty('insights');
    expect(body.insights).toHaveProperty('summary');
    expect(body.insights).toHaveProperty('strengths');
    expect(body.insights).toHaveProperty('areasForGrowth');
    expect(body.insights).toHaveProperty('recommendations');
    expect(body.insights).toHaveProperty('trends');
    expect(body).toHaveProperty('recentObservations');
    expect(body).toHaveProperty('milestoneProgress');
    expect(body.milestoneProgress).toHaveProperty('totalAchieved');
    expect(body.milestoneProgress).toHaveProperty('totalAvailable');
    expect(body.milestoneProgress).toHaveProperty('byDimension');
    expect(body).toHaveProperty('goals');
    expect(body.goals).toHaveProperty('active');
    expect(body.goals).toHaveProperty('completed');
    expect(body.goals).toHaveProperty('paused');
    expect(body).toHaveProperty('observationsByDimension');
  });

  // --- Empty State ---

  it('should return zero scores when no data exists', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    expect(body.overallScore).toBe(0);
    expect(body.dimensions).toHaveLength(6);
    for (const dim of body.dimensions) {
      expect(dim.score).toBe(0);
    }
    expect(body.recentObservations).toHaveLength(0);
    expect(body.milestoneProgress.totalAchieved).toBe(0);
    expect(body.milestoneProgress.totalAvailable).toBe(0);
    expect(body.goals.active).toBe(0);
    expect(body.goals.completed).toBe(0);
    expect(body.goals.paused).toBe(0);
  });

  // --- Dashboard Scores ---

  it('should include dashboard scores for all 6 dimensions', async () => {
    for (let i = 0; i < 5; i++) {
      await createObservation(
        authToken,
        childId,
        'academic',
        'positive'
      );
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const academic = body.dimensions.find(
      (d: any) => d.dimension === 'academic'
    );

    expect(academic).toBeDefined();
    expect(academic.score).toBeGreaterThan(0);
    expect(academic.factors).toBeDefined();
    expect(academic.observationCount).toBe(5);
  });

  // --- Insights ---

  it('should include AI insights in the report', async () => {
    for (let i = 0; i < 10; i++) {
      await createObservation(
        authToken,
        childId,
        'academic',
        'positive'
      );
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    expect(body.insights.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(body.insights.strengths)).toBe(true);
    expect(Array.isArray(body.insights.areasForGrowth)).toBe(true);
    expect(Array.isArray(body.insights.recommendations)).toBe(true);
    expect(body.insights.trends).toHaveProperty('overallDirection');
    expect(body.insights.trends).toHaveProperty('dimensionTrends');
  });

  // --- Recent Observations ---

  it('should include recent observations (default 10)', async () => {
    for (let i = 0; i < 15; i++) {
      await createObservation(
        authToken,
        childId,
        'academic',
        'positive'
      );
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.recentObservations).toHaveLength(10);
  });

  it('should respect observations query param', async () => {
    for (let i = 0; i < 15; i++) {
      await createObservation(
        authToken,
        childId,
        'academic',
        'positive'
      );
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary?observations=5`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.recentObservations).toHaveLength(5);
  });

  it('should exclude soft-deleted observations', async () => {
    const obs = await createObservation(
      authToken,
      childId,
      'academic',
      'positive'
    );
    await createObservation(
      authToken,
      childId,
      'physical',
      'neutral'
    );

    await prisma.observation.update({
      where: { id: obs.id },
      data: { deletedAt: new Date() },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.recentObservations).toHaveLength(1);
  });

  // --- Milestone Progress ---

  it('should aggregate milestone progress across dimensions', async () => {
    // Seed milestones for two dimensions
    const academicMilestones = [];
    for (let i = 1; i <= 4; i++) {
      academicMilestones.push(
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

    const physicalMilestones = [];
    for (let i = 1; i <= 3; i++) {
      physicalMilestones.push(
        await prisma.milestoneDefinition.create({
          data: {
            dimension: 'physical',
            ageBand: 'primary',
            title: `Physical milestone ${i}`,
            description: `Desc ${i}`,
            sortOrder: i,
          },
        })
      );
    }

    // Achieve 2 academic and 1 physical
    for (let i = 0; i < 2; i++) {
      await prisma.childMilestone.create({
        data: {
          childId,
          milestoneId: academicMilestones[i].id,
          achieved: true,
          achievedAt: new Date(),
        },
      });
    }
    await prisma.childMilestone.create({
      data: {
        childId,
        milestoneId: physicalMilestones[0].id,
        achieved: true,
        achievedAt: new Date(),
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    expect(body.milestoneProgress.totalAchieved).toBe(3);
    expect(body.milestoneProgress.totalAvailable).toBe(7);
    expect(body.milestoneProgress.byDimension.academic).toEqual({
      achieved: 2,
      total: 4,
    });
    expect(body.milestoneProgress.byDimension.physical).toEqual({
      achieved: 1,
      total: 3,
    });
  });

  // --- Goals ---

  it('should count goals by status', async () => {
    await createGoal(authToken, childId, 'academic', 'active');
    await createGoal(authToken, childId, 'physical', 'active');
    await createGoal(authToken, childId, 'islamic', 'active');

    // Complete one goal
    const goals = await prisma.goal.findMany({ where: { childId } });
    await prisma.goal.update({
      where: { id: goals[0].id },
      data: { status: 'completed' },
    });
    // Pause another
    await prisma.goal.update({
      where: { id: goals[1].id },
      data: { status: 'paused' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.goals.active).toBe(1);
    expect(body.goals.completed).toBe(1);
    expect(body.goals.paused).toBe(1);
  });

  // --- Observations by Dimension ---

  it('should count observations by dimension within date range', async () => {
    await createObservation(authToken, childId, 'academic', 'positive');
    await createObservation(authToken, childId, 'academic', 'positive');
    await createObservation(authToken, childId, 'physical', 'neutral');
    await createObservation(
      authToken,
      childId,
      'islamic',
      'positive'
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.observationsByDimension.academic).toBe(2);
    expect(body.observationsByDimension.physical).toBe(1);
    expect(body.observationsByDimension.islamic).toBe(1);
  });

  // --- Date Range Filtering ---

  it('should use default 30-day range when no params', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    const from = new Date(body.dateRange.from);
    const to = new Date(body.dateRange.to);
    const diffDays = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(diffDays).toBe(30);
  });

  it('should respect from/to query parameters', async () => {
    const from = '2025-01-01';
    const to = '2025-01-31';

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary?from=${from}&to=${to}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.dateRange.from).toBe(from);
    expect(body.dateRange.to).toBe(to);
  });

  it('should filter observations by date range', async () => {
    // Create an observation from 60 days ago directly
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    await prisma.observation.create({
      data: {
        childId,
        dimension: 'academic',
        content: 'Old observation',
        sentiment: 'positive',
        observedAt: sixtyDaysAgo,
      },
    });

    // Create a recent observation
    await createObservation(authToken, childId, 'academic', 'positive');

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    // Default 30-day range should exclude the old observation
    expect(body.observationsByDimension.academic).toBe(1);
  });

  // --- Out of Range Age Band ---

  it('should handle out-of-range age band', async () => {
    // Create a 2-year-old child directly (bypasses age validation)
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const youngChild = await prisma.child.create({
      data: {
        parentId: child!.parentId,
        name: 'Baby',
        dateOfBirth: twoYearsAgo,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${youngChild.id}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.ageBand).toBeNull();
    expect(body.milestoneProgress.totalAvailable).toBe(0);
  });

  // --- Comprehensive Report ---

  it('should aggregate all data sources into a single report', async () => {
    // Create observations
    for (let i = 0; i < 5; i++) {
      await createObservation(
        authToken,
        childId,
        'academic',
        'positive'
      );
    }
    await createObservation(
      authToken,
      childId,
      'physical',
      'neutral'
    );

    // Create milestones
    const milestone = await prisma.milestoneDefinition.create({
      data: {
        dimension: 'academic',
        ageBand: 'primary',
        title: 'Read fluently',
        description: 'Can read age-appropriate texts',
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

    // Create goals
    await createGoal(authToken, childId, 'academic', 'active');

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/reports/summary`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Verify all sections are populated
    expect(body.overallScore).toBeGreaterThan(0);
    expect(body.dimensions).toHaveLength(6);
    expect(body.recentObservations.length).toBeGreaterThan(0);
    expect(body.milestoneProgress.totalAchieved).toBe(1);
    expect(body.goals.active).toBe(1);
    expect(body.observationsByDimension.academic).toBe(5);
    expect(body.insights.summary.length).toBeGreaterThan(0);
  });
});
