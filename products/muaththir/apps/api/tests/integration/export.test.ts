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
  email: 'fatima-export@example.com',
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

async function createChild(
  pId: string,
  name = 'Ahmad',
  dateOfBirth = '2018-05-15'
): Promise<string> {
  const child = await prisma.child.create({
    data: {
      parentId: pId,
      name,
      dateOfBirth: new Date(dateOfBirth),
      gender: 'male',
    },
  });
  return child.id;
}

async function seedObservation(
  cId: string,
  overrides: Record<string, unknown> = {}
) {
  return prisma.observation.create({
    data: {
      childId: cId,
      dimension: 'academic',
      content: 'Ahmad completed his math homework independently',
      sentiment: 'positive',
      observedAt: new Date('2026-01-15'),
      tags: ['homework', 'math'],
      ...overrides,
    },
  });
}

async function seedMilestoneDefinition(
  overrides: Record<string, unknown> = {}
) {
  return prisma.milestoneDefinition.create({
    data: {
      dimension: 'academic',
      ageBand: 'early_years',
      title: 'Count to 10',
      description: 'Can count from 1 to 10',
      sortOrder: 1,
      ...overrides,
    },
  });
}

async function seedChildMilestone(
  cId: string,
  milestoneId: string,
  achieved = true
) {
  return prisma.childMilestone.create({
    data: {
      childId: cId,
      milestoneId,
      achieved,
      achievedAt: achieved ? new Date() : null,
    },
  });
}

async function seedGoal(
  cId: string,
  overrides: Record<string, unknown> = {}
) {
  return prisma.goal.create({
    data: {
      childId: cId,
      dimension: 'academic',
      title: 'Complete multiplication tables',
      status: 'active',
      targetDate: new Date('2026-06-15'),
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
  childId = await createChild(parentId);
});

// =============================================
// Authentication
// =============================================

describe('GET /api/export - Authentication', () => {
  it('should reject unauthenticated requests with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject invalid token with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export',
      headers: { authorization: 'Bearer invalid-token' },
    });

    expect(response.statusCode).toBe(401);
  });
});

// =============================================
// JSON Export (default)
// =============================================

describe('GET /api/export - JSON format', () => {
  it('should return JSON by default when no format specified', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
  });

  it('should return JSON when format=json', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
  });

  it('should set Content-Disposition for JSON download', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.headers['content-disposition']).toMatch(
      /attachment; filename="muaththir-export-\d{4}-\d{2}-\d{2}\.json"/
    );
  });

  it('should include profile info in JSON export', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.profile).toBeDefined();
    expect(body.profile.name).toBe('Fatima Ahmed');
    expect(body.profile.email).toBe('fatima-export@example.com');
    expect(body.profile.subscriptionTier).toBe('free');
  });

  it('should include children in JSON export', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.children).toHaveLength(1);
    expect(body.children[0].name).toBe('Ahmad');
    expect(body.children[0].dateOfBirth).toBeDefined();
    expect(body.children[0].gender).toBe('male');
  });

  it('should include observations per child', async () => {
    await seedObservation(childId);
    await seedObservation(childId, {
      dimension: 'social_emotional',
      content: 'Shared toys with sibling',
      sentiment: 'positive',
      observedAt: new Date('2026-01-20'),
      tags: ['sharing'],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.children[0].observations).toHaveLength(2);
    expect(body.children[0].observations[0].dimension).toBeDefined();
    expect(body.children[0].observations[0].content).toBeDefined();
    expect(body.children[0].observations[0].sentiment).toBeDefined();
    expect(body.children[0].observations[0].observedAt).toBeDefined();
    expect(body.children[0].observations[0].tags).toBeDefined();
  });

  it('should exclude soft-deleted observations', async () => {
    await seedObservation(childId);
    await seedObservation(childId, {
      dimension: 'social_emotional',
      content: 'Deleted observation',
      sentiment: 'neutral',
      observedAt: new Date('2026-01-20'),
      deletedAt: new Date(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.children[0].observations).toHaveLength(1);
  });

  it('should include child milestones per child', async () => {
    const milestone = await seedMilestoneDefinition();
    await seedChildMilestone(childId, milestone.id, true);

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.children[0].milestones).toHaveLength(1);
    expect(body.children[0].milestones[0].achieved).toBe(true);
    expect(body.children[0].milestones[0].milestoneTitle).toBe('Count to 10');
    expect(body.children[0].milestones[0].dimension).toBe('academic');
  });

  it('should include goals per child', async () => {
    await seedGoal(childId);

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.children[0].goals).toHaveLength(1);
    expect(body.children[0].goals[0].title).toBe(
      'Complete multiplication tables'
    );
    expect(body.children[0].goals[0].dimension).toBe('academic');
    expect(body.children[0].goals[0].status).toBe('active');
    expect(body.children[0].goals[0].targetDate).toBeDefined();
  });

  it('should include exportedAt timestamp', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.exportedAt).toBeDefined();
    // Should be a valid ISO date string
    expect(() => new Date(body.exportedAt)).not.toThrow();
  });

  it('should handle multiple children', async () => {
    await createChild(parentId, 'Sara', '2020-03-10');

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.children).toHaveLength(2);
  });

  it('should handle empty data (no children)', async () => {
    // Clean and re-register without creating children
    await cleanDb();
    accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.children).toHaveLength(0);
  });

  it('should not include data from other parents', async () => {
    // Create another parent with their own child
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other Parent',
        email: 'other-parent@example.com',
        password: 'SecurePass1',
      },
    });
    const otherParentId = otherRes.json().user.id;
    const otherChildId = await createChild(
      otherParentId,
      'OtherChild',
      '2019-01-01'
    );
    await seedObservation(otherChildId, {
      content: 'Other parent observation',
    });

    // Export for original parent
    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=json',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.children).toHaveLength(1);
    expect(body.children[0].name).toBe('Ahmad');
  });
});

// =============================================
// CSV Export
// =============================================

describe('GET /api/export - CSV format', () => {
  it('should return CSV when format=csv', async () => {
    await seedObservation(childId);

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=csv',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
  });

  it('should set Content-Disposition for CSV download', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=csv',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.headers['content-disposition']).toMatch(
      /attachment; filename="muaththir-export-\d{4}-\d{2}-\d{2}\.csv"/
    );
  });

  it('should include CSV headers', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=csv',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const lines = response.body.split('\n');
    expect(lines[0]).toBe(
      'child_name,dimension,content,sentiment,observed_at,tags'
    );
  });

  it('should include observation data in CSV rows', async () => {
    await seedObservation(childId);

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=csv',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const lines = response.body.split('\n');
    // Header + 1 data row + optional trailing newline
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const dataLine = lines[1];
    expect(dataLine).toContain('Ahmad');
    expect(dataLine).toContain('academic');
    expect(dataLine).toContain('positive');
  });

  it('should handle commas in content by quoting', async () => {
    await seedObservation(childId, {
      content: 'Ahmad read well, very impressive',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=csv',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const lines = response.body.split('\n');
    // Content with comma should be quoted
    expect(lines[1]).toContain('"Ahmad read well, very impressive"');
  });

  it('should handle quotes in content by escaping', async () => {
    await seedObservation(childId, {
      content: 'Ahmad said "hello" today',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=csv',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const lines = response.body.split('\n');
    // Quotes should be escaped as double quotes
    expect(lines[1]).toContain('"Ahmad said ""hello"" today"');
  });

  it('should return only headers when no observations exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=csv',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const lines = response.body.split('\n').filter((l) => l.trim() !== '');
    expect(lines).toHaveLength(1); // Just header
    expect(lines[0]).toBe(
      'child_name,dimension,content,sentiment,observed_at,tags'
    );
  });

  it('should join tags with semicolons in CSV', async () => {
    await seedObservation(childId, {
      tags: ['homework', 'math', 'independent'],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=csv',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const lines = response.body.split('\n');
    expect(lines[1]).toContain('homework;math;independent');
  });

  it('should exclude soft-deleted observations from CSV', async () => {
    await seedObservation(childId);
    await seedObservation(childId, {
      content: 'Deleted observation',
      deletedAt: new Date(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=csv',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const lines = response.body.split('\n').filter((l) => l.trim() !== '');
    expect(lines).toHaveLength(2); // Header + 1 data row
  });
});

// =============================================
// Validation
// =============================================

describe('GET /api/export - Validation', () => {
  it('should reject invalid format with 400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export?format=xml',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(400);
  });
});
