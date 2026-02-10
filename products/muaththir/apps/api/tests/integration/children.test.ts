import { FastifyInstance } from 'fastify';
import {
  setupTestDb,
  cleanDb,
  closeDb,
  prisma,
} from '../helpers/build-app';
import { buildApp } from '../../src/app';
import childrenRoutes from '../../src/routes/children';

let app: FastifyInstance;

beforeAll(async () => {
  await setupTestDb();
  app = await buildApp({ logger: false });
  await app.register(childrenRoutes, { prefix: '/api/children' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

beforeEach(async () => {
  await cleanDb();
});

// --- Helper functions ---

const validRegistration = {
  name: 'Fatima Ahmed',
  email: 'fatima@example.com',
  password: 'SecurePass1',
};

async function registerAndGetToken(
  overrides: Partial<typeof validRegistration> = {}
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { ...validRegistration, ...overrides },
  });
  return response.json().accessToken;
}

function childDob(ageYears: number): string {
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - ageYears);
  // Set to a safe date in the middle of the year to avoid edge cases
  dob.setMonth(0);
  dob.setDate(15);
  return dob.toISOString().split('T')[0];
}

// --- POST /api/children ---

describe('POST /api/children', () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndGetToken();
  });

  it('should create a child and return 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Ahmad',
        dateOfBirth: childDob(7),
        gender: 'male',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Ahmad');
    expect(body.gender).toBe('male');
    expect(body.ageBand).toBe('primary');
    expect(body.photoUrl).toBeNull();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it('should create a child without gender', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Layla',
        dateOfBirth: childDob(4),
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.name).toBe('Layla');
    expect(body.gender).toBeNull();
    expect(body.ageBand).toBe('early_years');
  });

  it('should calculate early_years age band for 3-5 year olds', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Child',
        dateOfBirth: childDob(4),
      },
    });

    expect(response.json().ageBand).toBe('early_years');
  });

  it('should calculate primary age band for 6-9 year olds', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Child',
        dateOfBirth: childDob(8),
      },
    });

    expect(response.json().ageBand).toBe('primary');
  });

  it('should calculate upper_primary age band for 10-12 year olds', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Child',
        dateOfBirth: childDob(11),
      },
    });

    expect(response.json().ageBand).toBe('upper_primary');
  });

  it('should calculate secondary age band for 13-16 year olds', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Child',
        dateOfBirth: childDob(14),
      },
    });

    expect(response.json().ageBand).toBe('secondary');
  });

  it('should reject child under 3 years old', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Baby',
        dateOfBirth: childDob(2),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().detail).toBe(
      'Child must be between 3 and 16 years old'
    );
  });

  it('should reject child over 16 years old', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Teen',
        dateOfBirth: childDob(17),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().detail).toBe(
      'Child must be between 3 and 16 years old'
    );
  });

  it('should reject empty name', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: '',
        dateOfBirth: childDob(7),
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject name over 100 characters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'A'.repeat(101),
        dateOfBirth: childDob(7),
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject missing dateOfBirth', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Ahmad',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject invalid gender value', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Ahmad',
        dateOfBirth: childDob(7),
        gender: 'other',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject unauthenticated request with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      payload: {
        name: 'Ahmad',
        dateOfBirth: childDob(7),
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should enforce free tier limit of 1 child', async () => {
    // Create first child (should succeed)
    const firstResponse = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'First Child',
        dateOfBirth: childDob(5),
      },
    });
    expect(firstResponse.statusCode).toBe(201);

    // Create second child (should fail for free tier)
    const secondResponse = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Second Child',
        dateOfBirth: childDob(8),
      },
    });
    expect(secondResponse.statusCode).toBe(403);
    expect(secondResponse.json().detail).toBe(
      'Free tier allows 1 child. Upgrade to premium for unlimited children.'
    );
  });

  it('should allow premium tier to create multiple children', async () => {
    // Upgrade parent to premium
    const parent = await prisma.parent.findFirst({
      where: { email: 'fatima@example.com' },
    });
    await prisma.parent.update({
      where: { id: parent!.id },
      data: { subscriptionTier: 'premium' },
    });

    // Create first child
    const first = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'First Child',
        dateOfBirth: childDob(5),
      },
    });
    expect(first.statusCode).toBe(201);

    // Create second child
    const second = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Second Child',
        dateOfBirth: childDob(8),
      },
    });
    expect(second.statusCode).toBe(201);
  });

  it('should accept ISO date with timezone offset', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Ahmad',
        dateOfBirth: `${childDob(7)}T00:00:00+03:00`,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it('should store child in database with correct parentId', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Ahmad',
        dateOfBirth: childDob(7),
        gender: 'male',
      },
    });

    const children = await prisma.child.findMany();
    expect(children.length).toBe(1);
    expect(children[0].name).toBe('Ahmad');
    expect(children[0].gender).toBe('male');

    const parent = await prisma.parent.findFirst({
      where: { email: 'fatima@example.com' },
    });
    expect(children[0].parentId).toBe(parent!.id);
  });
});

// --- GET /api/children ---

describe('GET /api/children', () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndGetToken();
  });

  it('should return empty list when no children', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it('should return list of children with pagination', async () => {
    // Upgrade to premium so we can create multiple children
    const parent = await prisma.parent.findFirst({
      where: { email: 'fatima@example.com' },
    });
    await prisma.parent.update({
      where: { id: parent!.id },
      data: { subscriptionTier: 'premium' },
    });

    // Create two children
    await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Ahmad', dateOfBirth: childDob(7), gender: 'male' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Layla', dateOfBirth: childDob(4), gender: 'female' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBe(2);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.page).toBe(1);
  });

  it('should include observation count and milestone progress', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Ahmad', dateOfBirth: childDob(7) },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
    });

    const child = response.json().data[0];
    expect(child.observationCount).toBeDefined();
    expect(child.observationCount).toBe(0);
    expect(child.milestoneProgress).toBeDefined();
    expect(child.milestoneProgress.total).toBe(0);
    expect(child.milestoneProgress.achieved).toBe(0);
  });

  it('should support page and limit query params', async () => {
    // Upgrade to premium
    const parent = await prisma.parent.findFirst({
      where: { email: 'fatima@example.com' },
    });
    await prisma.parent.update({
      where: { id: parent!.id },
      data: { subscriptionTier: 'premium' },
    });

    // Create 3 children
    for (const name of ['Child1', 'Child2', 'Child3']) {
      await app.inject({
        method: 'POST',
        url: '/api/children',
        headers: { authorization: `Bearer ${token}` },
        payload: { name, dateOfBirth: childDob(7) },
      });
    }

    const response = await app.inject({
      method: 'GET',
      url: '/api/children?page=1&limit=2',
      headers: { authorization: `Bearer ${token}` },
    });

    const body = response.json();
    expect(body.data.length).toBe(2);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.totalPages).toBe(2);
    expect(body.pagination.hasMore).toBe(true);
  });

  it('should not return children belonging to other parents', async () => {
    // Create a child for parent 1
    await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Ahmad', dateOfBirth: childDob(7) },
    });

    // Register another parent
    const token2 = await registerAndGetToken({
      name: 'Sara Ali',
      email: 'sara@example.com',
    });

    // Get children for parent 2
    const response = await app.inject({
      method: 'GET',
      url: '/api/children',
      headers: { authorization: `Bearer ${token2}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.length).toBe(0);
  });

  it('should reject unauthenticated request with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/children',
    });

    expect(response.statusCode).toBe(401);
  });
});

// --- GET /api/children/:id ---

describe('GET /api/children/:id', () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndGetToken();
  });

  it('should return a single child by id', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Ahmad', dateOfBirth: childDob(7), gender: 'male' },
    });
    const childId = createRes.json().id;

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe(childId);
    expect(body.name).toBe('Ahmad');
    expect(body.ageBand).toBe('primary');
  });

  it('should return 404 for non-existent child', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/children/nonexistent-id',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().detail).toBe('Child not found');
  });

  it('should return 404 when child belongs to another parent', async () => {
    // Create child for parent 1
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Ahmad', dateOfBirth: childDob(7) },
    });
    const childId = createRes.json().id;

    // Register another parent
    const token2 = await registerAndGetToken({
      name: 'Sara Ali',
      email: 'sara@example.com',
    });

    // Try to access child as parent 2
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token2}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject unauthenticated request with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/children/some-id',
    });

    expect(response.statusCode).toBe(401);
  });
});

// --- PATCH /api/children/:id ---

describe('PATCH /api/children/:id', () => {
  let token: string;
  let childId: string;

  beforeEach(async () => {
    token = await registerAndGetToken();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Ahmad', dateOfBirth: childDob(7), gender: 'male' },
    });
    childId = createRes.json().id;
  });

  it('should update child name', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Mohammed' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe('Mohammed');
  });

  it('should update child dateOfBirth', async () => {
    const newDob = childDob(10);
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { dateOfBirth: newDob },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().ageBand).toBe('upper_primary');
  });

  it('should update child gender', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { gender: 'female' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().gender).toBe('female');
  });

  it('should allow setting gender to null', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { gender: null },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().gender).toBeNull();
  });

  it('should reject invalid age on dateOfBirth update', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { dateOfBirth: childDob(2) },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject name over 100 characters', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'A'.repeat(101) },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should return 404 for non-existent child', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/children/nonexistent-id',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'New Name' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404 when child belongs to another parent', async () => {
    const token2 = await registerAndGetToken({
      name: 'Sara Ali',
      email: 'sara@example.com',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token2}` },
      payload: { name: 'Hacked' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject unauthenticated request with 401', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}`,
      payload: { name: 'New Name' },
    });

    expect(response.statusCode).toBe(401);
  });
});

// --- DELETE /api/children/:id ---

describe('DELETE /api/children/:id', () => {
  let token: string;
  let childId: string;

  beforeEach(async () => {
    token = await registerAndGetToken();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Ahmad', dateOfBirth: childDob(7), gender: 'male' },
    });
    childId = createRes.json().id;
  });

  it('should delete a child and return 204', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);

    // Verify deleted from database
    const child = await prisma.child.findUnique({ where: { id: childId } });
    expect(child).toBeNull();
  });

  it('should return 404 for non-existent child', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/children/nonexistent-id',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404 when child belongs to another parent', async () => {
    const token2 = await registerAndGetToken({
      name: 'Sara Ali',
      email: 'sara@example.com',
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token2}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject unauthenticated request with 401', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should allow creating a new child after deleting (free tier)', async () => {
    // Delete the child
    await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    // Create a new child (free tier limit should be available again)
    const response = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'New Child', dateOfBirth: childDob(5) },
    });

    expect(response.statusCode).toBe(201);
  });
});
