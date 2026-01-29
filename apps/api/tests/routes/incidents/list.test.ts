import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../../../src/app.js';
import { PrismaClient, Priority, Impact, Urgency } from '@prisma/client';
import { createIncident } from '../../../src/services/incident.service.js';

const prisma = new PrismaClient();

describe('GET /api/v1/incidents', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let testCategoryId: string;
  let testUserId: string;
  let testRoleId: string;

  beforeEach(async () => {
    app = buildApp();

    // Clean up in correct order
    await prisma.incident.deleteMany({ where: { title: { contains: 'List Test' } } });
    await prisma.category.deleteMany({ where: { name: { contains: 'List Test' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'listtest@' } } });
    await prisma.role.deleteMany({ where: { name: { contains: 'List Test' } } });
    // Don't reset sequences - tests should work regardless of existing data

    // Create test data
    const role = await prisma.role.create({
      data: { name: 'List Test Role', level: 1 },
    });
    testRoleId = role.id;

    const user = await prisma.user.create({
      data: {
        email: 'listtest@example.com',
        passwordHash: 'hashed',
        firstName: 'List',
        lastName: 'Test',
        roleId: testRoleId,
      },
    });
    testUserId = user.id;

    const category = await prisma.category.create({
      data: { name: 'List Test Category', type: 'INCIDENT' },
    });
    testCategoryId = category.id;

    // Create test incidents
    await createIncident(prisma, {
      title: 'List Test Incident 1',
      description: 'First list test incident with sufficient description',
      priority: Priority.P3,
      impact: Impact.MEDIUM,
      urgency: Urgency.MEDIUM,
      categoryId: testCategoryId,
      reportedById: testUserId,
    });

    await createIncident(prisma, {
      title: 'List Test Incident 2',
      description: 'Second list test incident with sufficient description',
      priority: Priority.P2,
      impact: Impact.HIGH,
      urgency: Urgency.HIGH,
      categoryId: testCategoryId,
      reportedById: testUserId,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return paginated incidents', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/incidents',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
  });

  it('should filter by priority', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/incidents?priority=P2',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.every((i: any) => i.priority === Priority.P2)).toBe(true);
  });
});
