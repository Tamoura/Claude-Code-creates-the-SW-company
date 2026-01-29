import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../../src/app.js';
import { PrismaClient, Priority, Impact, Urgency } from '@prisma/client';

const prisma = new PrismaClient();

describe('POST /api/v1/incidents', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let testCategoryId: string;
  let testUserId: string;
  let testRoleId: string;

  beforeEach(async () => {
    app = buildApp();

    // Clean up in correct order
    await prisma.incident.deleteMany({ where: { title: { contains: 'Route Test' } } });
    await prisma.category.deleteMany({ where: { name: { contains: 'Route Test' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'routetest@' } } });
    await prisma.role.deleteMany({ where: { name: { contains: 'Route Test' } } });
    // Don't reset sequences - tests should work regardless of existing data

    // Create test role
    const role = await prisma.role.create({
      data: { name: 'Route Test Role', level: 1 },
    });
    testRoleId = role.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'routetest@example.com',
        passwordHash: 'hashed',
        firstName: 'Route',
        lastName: 'Test',
        roleId: testRoleId,
      },
    });
    testUserId = user.id;

    // Create test category
    const category = await prisma.category.create({
      data: { name: 'Route Test Category', type: 'INCIDENT' },
    });
    testCategoryId = category.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it('should create incident successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      payload: {
        title: 'Route Test Incident 1',
        description: 'This is a route test incident with sufficient description text',
        priority: Priority.P3,
        impact: Impact.MEDIUM,
        urgency: Urgency.MEDIUM,
        categoryId: testCategoryId,
        reportedById: testUserId,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.displayId).toMatch(/^INC-\d{5}$/);
    expect(body.title).toBe('Route Test Incident 1');
  });

  it('should return 400 for invalid data', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      payload: {
        title: 'Too short',
        description: 'Short',
        priority: 'INVALID',
        impact: Impact.MEDIUM,
        urgency: Urgency.MEDIUM,
        categoryId: testCategoryId,
        reportedById: testUserId,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
