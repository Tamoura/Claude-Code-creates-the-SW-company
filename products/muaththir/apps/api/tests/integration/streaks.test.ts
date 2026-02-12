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
  name: 'Streak Parent',
  email: 'streak-parent@test.com',
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

/** Create an observation on a specific date directly via prisma */
async function createObservationOnDate(
  childId: string,
  date: Date
): Promise<void> {
  await prisma.observation.create({
    data: {
      childId,
      dimension: 'academic',
      content: `Observation on ${date.toISOString().split('T')[0]}`,
      sentiment: 'positive',
      observedAt: date,
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

describe('GET /api/children/:childId/streaks', () => {
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
      url: `/api/children/${childId}/streaks`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('should return 404 for non-existent child', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/children/nonexistent-id/streaks',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for child belonging to another parent', async () => {
    const otherToken = await registerAndGetToken({
      email: 'other-streak@test.com',
      name: 'Other Parent',
    });
    const otherChild = await createChild(otherToken, 'Other Child', 8);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${otherChild.id}/streaks`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return zeros when no observations exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/streaks`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual({
      currentStreak: 0,
      bestStreak: 0,
      totalObservations: 0,
      lastObservationDate: null,
    });
  });

  it('should calculate a single-day streak', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await createObservationOnDate(childId, today);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/streaks`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.currentStreak).toBe(1);
    expect(body.bestStreak).toBe(1);
    expect(body.totalObservations).toBe(1);
    expect(body.lastObservationDate).toBe(
      today.toISOString().split('T')[0]
    );
  });

  it('should calculate consecutive day streaks', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create observations for 5 consecutive days ending today
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      await createObservationOnDate(childId, d);
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/streaks`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.currentStreak).toBe(5);
    expect(body.bestStreak).toBe(5);
    expect(body.totalObservations).toBe(5);
  });

  it('should handle gaps in observations (broken streak)', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Current streak: today + yesterday = 2
    await createObservationOnDate(childId, today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    await createObservationOnDate(childId, yesterday);

    // Gap: skip day -2

    // Old streak: 3 consecutive days ending 3 days ago
    for (let i = 3; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      await createObservationOnDate(childId, d);
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/streaks`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.currentStreak).toBe(2);
    expect(body.bestStreak).toBe(3);
    expect(body.totalObservations).toBe(5);
  });

  it('should count multiple observations on same day as one streak day', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3 observations today
    await createObservationOnDate(childId, today);
    await createObservationOnDate(childId, today);
    await createObservationOnDate(childId, today);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/streaks`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.currentStreak).toBe(1);
    expect(body.bestStreak).toBe(1);
    expect(body.totalObservations).toBe(3);
  });

  it('should exclude soft-deleted observations', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await createObservationOnDate(childId, today);
    const obs = await prisma.observation.create({
      data: {
        childId,
        dimension: 'physical',
        content: 'Deleted obs',
        sentiment: 'positive',
        observedAt: today,
        deletedAt: new Date(),
      },
    });

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    // Only create a deleted observation for yesterday
    await prisma.observation.create({
      data: {
        childId,
        dimension: 'academic',
        content: 'Deleted yesterday obs',
        sentiment: 'positive',
        observedAt: yesterday,
        deletedAt: new Date(),
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/streaks`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    // Only today has a non-deleted observation
    expect(body.currentStreak).toBe(1);
    expect(body.totalObservations).toBe(1);
  });

  it('should set currentStreak to 0 if most recent obs is not today or yesterday', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setHours(0, 0, 0, 0);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const fourDaysAgo = new Date(threeDaysAgo);
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 1);

    await createObservationOnDate(childId, threeDaysAgo);
    await createObservationOnDate(childId, fourDaysAgo);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/streaks`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = res.json();
    expect(body.currentStreak).toBe(0);
    expect(body.bestStreak).toBe(2);
    expect(body.totalObservations).toBe(2);
  });
});
