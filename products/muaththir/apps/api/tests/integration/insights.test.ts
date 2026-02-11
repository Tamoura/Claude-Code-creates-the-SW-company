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
  name: 'Insights Parent',
  email: 'insights-parent@test.com',
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

async function createObservationDirect(
  childId: string,
  dimension: string,
  sentiment: string,
  daysAgo: number
) {
  const observedAt = new Date();
  observedAt.setDate(observedAt.getDate() - daysAgo);
  return prisma.observation.create({
    data: {
      childId,
      dimension: dimension as any,
      content: `Direct observation for ${dimension}`,
      sentiment: sentiment as any,
      observedAt,
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
});

describe('GET /api/dashboard/:childId/insights', () => {
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
      url: `/api/dashboard/${childId}/insights`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('should verify child ownership (404 for other parent)', async () => {
    // Create second parent's child directly in DB
    const otherParent = await prisma.parent.create({
      data: {
        name: 'Other Parent',
        email: 'other-insights@test.com',
        passwordHash: 'hashed',
      },
    });
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 8);
    const otherChild = await prisma.child.create({
      data: {
        parentId: otherParent.id,
        name: 'Other Child',
        dateOfBirth: dob,
      },
    });

    // First parent tries to access second parent's child
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${otherChild.id}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for non-existent child', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dashboard/nonexistent-id/insights',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  // --- Response Structure ---

  it('should return correct response structure', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body).toHaveProperty('childId', childId);
    expect(body).toHaveProperty('childName', 'Ahmad');
    expect(body).toHaveProperty('generatedAt');
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('strengths');
    expect(body).toHaveProperty('areasForGrowth');
    expect(body).toHaveProperty('recommendations');
    expect(body).toHaveProperty('trends');
    expect(body.trends).toHaveProperty('overallDirection');
    expect(body.trends).toHaveProperty('dimensionTrends');

    expect(Array.isArray(body.strengths)).toBe(true);
    expect(Array.isArray(body.areasForGrowth)).toBe(true);
    expect(Array.isArray(body.recommendations)).toBe(true);
  });

  // --- Empty State ---

  it('should return empty strengths and all areas when no observations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    // No observations means no dimension qualifies as a strength
    expect(body.strengths).toHaveLength(0);

    // All 6 dimensions should appear as areas for growth (< 2 obs)
    expect(body.areasForGrowth.length).toBe(6);

    // All dimension trends should be no_data
    for (const dim of Object.values(body.trends.dimensionTrends)) {
      expect(dim).toBe('no_data');
    }
  });

  // --- Strengths ---

  it('should identify strengths (score >= 60 AND >= 3 observations)', async () => {
    // Create 10 positive observations for academic
    // score = (100*0.4) + (0*0.4) + (100*0.2) = 60
    for (let i = 0; i < 10; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }

    // Also create milestones to boost social_emotional above 60
    const milestones = [];
    for (let i = 1; i <= 4; i++) {
      milestones.push(
        await prisma.milestoneDefinition.create({
          data: {
            dimension: 'social_emotional',
            ageBand: 'primary',
            title: `SE milestone ${i}`,
            description: `Desc ${i}`,
            sortOrder: i,
          },
        })
      );
    }
    for (let i = 0; i < 4; i++) {
      await prisma.childMilestone.create({
        data: {
          childId,
          milestoneId: milestones[i].id,
          achieved: true,
          achievedAt: new Date(),
        },
      });
    }
    // 10 positive SE obs: obs=100, milestone=100, sentiment=100
    // score = (100*0.4)+(100*0.4)+(100*0.2) = 100
    for (let i = 0; i < 10; i++) {
      await createObservation(
        authToken,
        childId,
        'social_emotional',
        'positive'
      );
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    // Both should appear as strengths (score >= 60 and >= 3 obs)
    expect(body.strengths.length).toBeGreaterThanOrEqual(2);

    const academicStrength = body.strengths.find(
      (s: any) => s.dimension === 'academic'
    );
    expect(academicStrength).toBeDefined();
    expect(academicStrength.score).toBeGreaterThanOrEqual(60);
    expect(academicStrength.title).toBeDefined();
    expect(academicStrength.detail).toBeDefined();
  });

  it('should limit strengths to top 3', async () => {
    // Create observations across 4 dimensions
    const dims = [
      'academic',
      'social_emotional',
      'behavioural',
      'physical',
    ];
    for (const dim of dims) {
      for (let i = 0; i < 10; i++) {
        await createObservation(authToken, childId, dim, 'positive');
      }
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.strengths.length).toBeLessThanOrEqual(3);
  });

  // --- Areas for Growth ---

  it('should identify areas for growth (score < 40 OR < 2 observations)', async () => {
    // Only add 1 observation for physical (< 2 obs)
    await createObservation(
      authToken,
      childId,
      'physical',
      'needs_attention'
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    const physicalArea = body.areasForGrowth.find(
      (a: any) => a.dimension === 'physical'
    );
    expect(physicalArea).toBeDefined();
    expect(physicalArea.suggestions).toBeDefined();
    expect(Array.isArray(physicalArea.suggestions)).toBe(true);
    expect(physicalArea.suggestions.length).toBeGreaterThan(0);
  });

  // --- Recommendations ---

  it('should recommend observation_gap for dimensions with 0 recent obs', async () => {
    // Only add observations for academic, nothing else
    for (let i = 0; i < 3; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    const gapRecs = body.recommendations.filter(
      (r: any) => r.type === 'observation_gap'
    );
    // At least 5 dimensions have 0 observations
    expect(gapRecs.length).toBeGreaterThanOrEqual(5);
    expect(gapRecs[0]).toHaveProperty('message');
    expect(gapRecs[0]).toHaveProperty('priority');
  });

  it('should return milestone_reminder when > 2 milestones due', async () => {
    // Seed 4 milestones for primary age band
    for (let i = 1; i <= 4; i++) {
      await prisma.milestoneDefinition.create({
        data: {
          dimension: 'academic',
          ageBand: 'primary',
          title: `Academic milestone ${i}`,
          description: `Description ${i}`,
          sortOrder: i,
        },
      });
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    const milestoneRec = body.recommendations.find(
      (r: any) => r.type === 'milestone_reminder'
    );
    expect(milestoneRec).toBeDefined();
    expect(milestoneRec.priority).toBe('low');
  });

  it('should return sentiment_alert when needs_attention > 50%', async () => {
    // 3 needs_attention + 1 positive = 75% needs_attention
    for (let i = 0; i < 3; i++) {
      await createObservation(
        authToken,
        childId,
        'behavioural',
        'needs_attention'
      );
    }
    await createObservation(authToken, childId, 'behavioural', 'positive');

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    const sentimentRec = body.recommendations.find(
      (r: any) => r.type === 'sentiment_alert'
    );
    expect(sentimentRec).toBeDefined();
    expect(sentimentRec.priority).toBe('high');
  });

  it('should return consistency_praise when all 6 dims have obs', async () => {
    const dims = [
      'academic',
      'social_emotional',
      'behavioural',
      'aspirational',
      'islamic',
      'physical',
    ];
    for (const dim of dims) {
      await createObservation(authToken, childId, dim, 'positive');
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    const consistencyRec = body.recommendations.find(
      (r: any) => r.type === 'consistency_praise'
    );
    expect(consistencyRec).toBeDefined();
    expect(consistencyRec.priority).toBe('low');
  });

  it('should return streak_notice when > 5 obs in last 7 days', async () => {
    for (let i = 0; i < 6; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();

    const streakRec = body.recommendations.find(
      (r: any) => r.type === 'streak_notice'
    );
    expect(streakRec).toBeDefined();
    expect(streakRec.priority).toBe('low');
  });

  // --- Trends ---

  it('should return improving trend when current > previous 30 days', async () => {
    // Create 1 observation 45 days ago (previous period)
    await createObservationDirect(childId, 'academic', 'positive', 45);

    // Create 3 observations within last 30 days (current period)
    for (let i = 0; i < 3; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.trends.dimensionTrends.academic).toBe('improving');
  });

  it('should return declining trend when current < previous 30 days', async () => {
    // Create 3 observations 45 days ago (previous period)
    for (let i = 0; i < 3; i++) {
      await createObservationDirect(
        childId,
        'social_emotional',
        'positive',
        45
      );
    }

    // Create 1 observation within last 30 days (current period)
    await createObservation(
      authToken,
      childId,
      'social_emotional',
      'positive'
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.trends.dimensionTrends.social_emotional).toBe('declining');
  });

  it('should return stable trend when current equals previous 30 days', async () => {
    // 2 observations in previous period
    await createObservationDirect(childId, 'islamic', 'positive', 45);
    await createObservationDirect(childId, 'islamic', 'positive', 50);

    // 2 observations in current period
    await createObservation(authToken, childId, 'islamic', 'positive');
    await createObservation(authToken, childId, 'islamic', 'positive');

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.trends.dimensionTrends.islamic).toBe('stable');
  });

  it('should return no_data trend for dimensions with zero observations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.trends.dimensionTrends.physical).toBe('no_data');
  });

  it('should return needs_attention trend when > 50% needs_attention recently', async () => {
    // 3 needs_attention + 1 positive in recent period
    for (let i = 0; i < 3; i++) {
      await createObservation(
        authToken,
        childId,
        'behavioural',
        'needs_attention'
      );
    }
    await createObservation(authToken, childId, 'behavioural', 'positive');

    // Also some in previous period so it's not just "improving"
    await createObservationDirect(
      childId,
      'behavioural',
      'positive',
      45
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.trends.dimensionTrends.behavioural).toBe('needs_attention');
  });

  // --- Overall Direction ---

  it('should determine overall direction from dimension trends', async () => {
    // Create data so some dimensions improve, others don't
    // academic: improving (3 current, 1 previous)
    await createObservationDirect(childId, 'academic', 'positive', 45);
    for (let i = 0; i < 3; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    // overallDirection should be one of: improving, declining, stable
    expect(['improving', 'declining', 'stable']).toContain(
      body.trends.overallDirection
    );
  });

  // --- Mixed Scenario ---

  it('should return insights for child with mixed observations', async () => {
    // Strong academic: 10 positive observations
    // score = (100*0.4) + (0*0.4) + (100*0.2) = 60
    for (let i = 0; i < 10; i++) {
      await createObservation(authToken, childId, 'academic', 'positive');
    }

    // Weak physical: 1 needs_attention (< 2 obs => area for growth)
    await createObservation(
      authToken,
      childId,
      'physical',
      'needs_attention'
    );

    // Moderate social: 3 positive, no milestones
    // score = (30*0.4) + (0*0.4) + (100*0.2) = 12+0+20 = 32
    for (let i = 0; i < 3; i++) {
      await createObservation(
        authToken,
        childId,
        'social_emotional',
        'positive'
      );
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboard/${childId}/insights`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Academic: score=60, obs>=3 => strength
    const academicStrength = body.strengths.find(
      (s: any) => s.dimension === 'academic'
    );
    expect(academicStrength).toBeDefined();
    expect(academicStrength.score).toBe(60);

    // Physical: 1 obs (< 2) => area for growth
    const physicalArea = body.areasForGrowth.find(
      (a: any) => a.dimension === 'physical'
    );
    expect(physicalArea).toBeDefined();

    // Missing dimensions should have observation_gap recs
    const gapRecs = body.recommendations.filter(
      (r: any) => r.type === 'observation_gap'
    );
    // islamic, aspirational, behavioural have 0 obs
    expect(gapRecs.length).toBeGreaterThanOrEqual(3);

    // Summary should be non-empty
    expect(body.summary.length).toBeGreaterThan(0);
  });
});
