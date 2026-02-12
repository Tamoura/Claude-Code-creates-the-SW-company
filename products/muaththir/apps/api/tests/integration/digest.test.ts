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
  name: 'Digest Parent',
  email: 'digest@example.com',
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

async function createChildViaApi(
  token: string,
  name: string,
  ageYears: number
): Promise<string> {
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - ageYears);
  const res = await app.inject({
    method: 'POST',
    url: '/api/children',
    headers: { authorization: `Bearer ${token}` },
    payload: { name, dateOfBirth: dob.toISOString().split('T')[0] },
  });
  return res.json().id;
}

async function createObservation(
  token: string,
  childId: string,
  dimension: string,
  sentiment: string
): Promise<void> {
  await app.inject({
    method: 'POST',
    url: `/api/children/${childId}/observations`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      dimension,
      content: `Weekly digest test obs for ${dimension}`,
      sentiment,
    },
  });
}

async function seedMilestoneAndAchieve(
  childId: string,
  dimension: string,
  ageBand: string,
  sortOrder: number
): Promise<void> {
  const m = await prisma.milestoneDefinition.create({
    data: {
      dimension: dimension as any,
      ageBand: ageBand as any,
      title: `${dimension} milestone ${sortOrder}`,
      description: `Desc for ${dimension} ${sortOrder}`,
      sortOrder,
    },
  });

  await prisma.childMilestone.create({
    data: {
      childId,
      milestoneId: m.id,
      achieved: true,
      achievedAt: new Date(),
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

// =============================================
// GET /api/digest/weekly
// =============================================

describe('GET /api/digest/weekly', () => {
  it('should require authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return correct structure with empty data', async () => {
    const token = await registerAndGetToken();

    const res = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body).toHaveProperty('period');
    expect(body.period).toHaveProperty('from');
    expect(body.period).toHaveProperty('to');
    expect(body).toHaveProperty('children');
    expect(body.children).toEqual([]);
    expect(body).toHaveProperty('overall');
    expect(body.overall).toEqual({
      totalObservations: 0,
      totalMilestones: 0,
    });
  });

  it('should return correct period (last 7 days)', async () => {
    const token = await registerAndGetToken();

    const res = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json();

    const to = new Date(body.period.to);
    const from = new Date(body.period.from);
    const diffDays = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(diffDays).toBe(7);
  });

  it('should aggregate weekly data per child', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaApi(token, 'Ahmad', 7);

    // Create 3 observations this week
    await createObservation(token, childId, 'academic', 'positive');
    await createObservation(token, childId, 'academic', 'positive');
    await createObservation(token, childId, 'physical', 'neutral');

    // Create 2 milestones achieved this week
    await seedMilestoneAndAchieve(childId, 'academic', 'primary', 1);
    await seedMilestoneAndAchieve(childId, 'physical', 'primary', 1);

    const res = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.children).toHaveLength(1);
    const childData = body.children[0];
    expect(childData.childId).toBe(childId);
    expect(childData.childName).toBe('Ahmad');
    expect(childData.observationCount).toBe(3);
    expect(childData.milestonesAchieved).toBe(2);
    expect(childData).toHaveProperty('topDimension');
    expect(childData).toHaveProperty('areasNeedingAttention');

    expect(body.overall.totalObservations).toBe(3);
    expect(body.overall.totalMilestones).toBe(2);
  });

  it('should show multiple children for the same parent', async () => {
    const token = await registerAndGetToken();

    // Upgrade to premium to allow multiple children
    await prisma.parent.update({
      where: { id: parentId },
      data: { subscriptionTier: 'premium' },
    });

    const child1Id = await createChildViaApi(token, 'Ahmad', 7);
    const child2Id = await createChildViaApi(token, 'Layla', 5);

    await createObservation(token, child1Id, 'academic', 'positive');
    await createObservation(token, child2Id, 'physical', 'positive');
    await createObservation(token, child2Id, 'physical', 'positive');

    const res = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.children).toHaveLength(2);
    expect(body.overall.totalObservations).toBe(3);
    expect(body.overall.totalMilestones).toBe(0);
  });

  it('should only include own children (ownership)', async () => {
    const token1 = await registerAndGetToken(
      'Parent1',
      'parent1@digest.com'
    );
    const parent1Id = parentId;
    const child1Id = await createChildViaApi(token1, 'Ahmad', 7);

    const token2 = await registerAndGetToken(
      'Parent2',
      'parent2@digest.com'
    );
    const child2Id = await createChildViaApi(token2, 'Sara', 6);

    await createObservation(token1, child1Id, 'academic', 'positive');
    await createObservation(token2, child2Id, 'physical', 'positive');

    // Parent1 should only see child1
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
      headers: { authorization: `Bearer ${token1}` },
    });

    const body1 = res1.json();
    expect(body1.children).toHaveLength(1);
    expect(body1.children[0].childName).toBe('Ahmad');
    expect(body1.overall.totalObservations).toBe(1);

    // Parent2 should only see child2
    const res2 = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
      headers: { authorization: `Bearer ${token2}` },
    });

    const body2 = res2.json();
    expect(body2.children).toHaveLength(1);
    expect(body2.children[0].childName).toBe('Sara');
    expect(body2.overall.totalObservations).toBe(1);
  });

  it('should handle children with no activity this week', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaApi(token, 'Ahmad', 7);

    // No observations, no milestones
    const res = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Child exists but has no activity - still shown
    expect(body.children).toHaveLength(1);
    const childData = body.children[0];
    expect(childData.observationCount).toBe(0);
    expect(childData.milestonesAchieved).toBe(0);
    expect(childData.topDimension).toBeNull();
    expect(childData.areasNeedingAttention).toEqual([]);
  });

  it('should exclude observations older than 7 days', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaApi(token, 'Ahmad', 7);

    // Create a recent observation
    await createObservation(token, childId, 'academic', 'positive');

    // Create an old observation (10 days ago) directly in DB
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    await prisma.observation.create({
      data: {
        childId,
        dimension: 'physical',
        content: 'Old observation',
        sentiment: 'positive',
        observedAt: tenDaysAgo,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json();
    const childData = body.children[0];
    expect(childData.observationCount).toBe(1);
    expect(body.overall.totalObservations).toBe(1);
  });

  it('should identify areas needing attention from needs_attention sentiment', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaApi(token, 'Ahmad', 7);

    // Create needs_attention observations
    await createObservation(token, childId, 'behavioural', 'needs_attention');
    await createObservation(token, childId, 'academic', 'positive');

    const res = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json();
    const childData = body.children[0];
    expect(childData.areasNeedingAttention).toContain('behavioural');
    expect(childData.areasNeedingAttention).not.toContain('academic');
  });

  it('should identify top dimension by observation count', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaApi(token, 'Ahmad', 7);

    // Academic has more observations
    await createObservation(token, childId, 'academic', 'positive');
    await createObservation(token, childId, 'academic', 'positive');
    await createObservation(token, childId, 'academic', 'positive');
    await createObservation(token, childId, 'physical', 'positive');

    const res = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json();
    const childData = body.children[0];
    expect(childData.topDimension).toBe('academic');
  });

  it('should exclude milestones achieved before the week period', async () => {
    const token = await registerAndGetToken();
    const childId = await createChildViaApi(token, 'Ahmad', 7);

    // Create milestone achieved 10 days ago
    const m = await prisma.milestoneDefinition.create({
      data: {
        dimension: 'academic',
        ageBand: 'primary',
        title: 'Old milestone',
        description: 'Achieved long ago',
        sortOrder: 1,
      },
    });

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    await prisma.childMilestone.create({
      data: {
        childId,
        milestoneId: m.id,
        achieved: true,
        achievedAt: tenDaysAgo,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/digest/weekly',
      headers: { authorization: `Bearer ${token}` },
    });

    const body = res.json();
    const childData = body.children[0];
    expect(childData.milestonesAchieved).toBe(0);
    expect(body.overall.totalMilestones).toBe(0);
  });
});
