import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient, Priority, Impact, Urgency, IncidentStatus } from '@prisma/client';
import { createIncident, getIncident, listIncidents, updateIncident, deleteIncident } from '../../src/services/incident.service.js';

const prisma = new PrismaClient();

describe('Incident Service', () => {
  let testCategoryId: string;
  let testUserId: string;
  let testRoleId: string;
  let testSlaConfigId: string;

  beforeEach(async () => {
    // Clean up test data in correct order (FK constraints)
    // Note: We don't delete categories or roles as they might be referenced by seed data
    // Delete by displayId to catch any orphaned records from previous runs
    await prisma.incident.deleteMany({
      where: { displayId: { gte: 'INC-00006' } }, // Seed creates INC-00001 to INC-00005
    });
    await prisma.sLAConfig.deleteMany({
      where: { name: 'Test SLA' },
    });
    await prisma.category.deleteMany({
      where: { name: 'Test Hardware' },
    });
    await prisma.user.deleteMany({
      where: { email: 'test@incident-test.com' },
    });
    // Reuse or create role
    let existingRole = await prisma.role.findFirst({
      where: { name: 'Test Role' },
    });
    if (existingRole) {
      testRoleId = existingRole.id;
    }
    // Don't reset sequences - just work with existing data
    // Tests should work regardless of existing sequence values

    // Create test role if needed
    if (!testRoleId) {
      const role = await prisma.role.create({
        data: {
          name: 'Test Role',
          description: 'Test role for testing',
          level: 1,
        },
      });
      testRoleId = role.id;
    }

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@incident-test.com',
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        roleId: testRoleId,
      },
    });
    testUserId = user.id;

    // Create test category
    const category = await prisma.category.create({
      data: {
        name: 'Test Hardware',
        type: 'INCIDENT',
      },
    });
    testCategoryId = category.id;

    // Create test SLA config
    const slaConfig = await prisma.sLAConfig.create({
      data: {
        name: 'Test SLA',
      },
    });
    testSlaConfigId = slaConfig.id;
  });

  afterAll(async () => {
    // Clean up all test data after all tests complete
    await prisma.incident.deleteMany({
      where: { title: { contains: 'Test Incident' } },
    });
    await prisma.sLAConfig.deleteMany({
      where: { name: 'Test SLA' },
    });
    await prisma.category.deleteMany({
      where: { name: 'Test Hardware' },
    });
    await prisma.user.deleteMany({
      where: { email: 'test@incident-test.com' },
    });
    // Don't delete role as seed users might reference it
  });

  describe('createIncident', () => {
    it('should create incident with generated ID', async () => {
      const incident = await createIncident(prisma, {
        title: 'Test Incident 1',
        description: 'This is a test incident with sufficient description',
        priority: Priority.P3,
        impact: Impact.MEDIUM,
        urgency: Urgency.MEDIUM,
        categoryId: testCategoryId,
        reportedById: testUserId,
      });

      expect(incident.displayId).toMatch(/^INC-\d{5}$/);
      expect(incident.title).toBe('Test Incident 1');
      expect(incident.priority).toBe(Priority.P3);
      expect(incident.status).toBe(IncidentStatus.NEW);
      expect(incident.responseSlaDue).toBeDefined();
      expect(incident.resolutionSlaDue).toBeDefined();
    });

    it('should log audit trail on creation', async () => {
      const incident = await createIncident(prisma, {
        title: 'Test Incident 2',
        description: 'Another test incident with sufficient description',
        priority: Priority.P2,
        impact: Impact.HIGH,
        urgency: Urgency.HIGH,
        categoryId: testCategoryId,
        reportedById: testUserId,
      });

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'INCIDENT',
          entityId: incident.id,
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe('CREATE');
    });
  });

  describe('getIncident', () => {
    it('should return incident by ID', async () => {
      const created = await createIncident(prisma, {
        title: 'Test Incident 3',
        description: 'Test incident for retrieval with sufficient description',
        priority: Priority.P4,
        impact: Impact.LOW,
        urgency: Urgency.LOW,
        categoryId: testCategoryId,
        reportedById: testUserId,
      });

      const incident = await getIncident(prisma, created.id);

      expect(incident).not.toBeNull();
      expect(incident?.id).toBe(created.id);
      expect(incident?.title).toBe('Test Incident 3');
    });

    it('should return null for non-existent incident', async () => {
      const incident = await getIncident(prisma, 'non-existent-id');
      expect(incident).toBeNull();
    });
  });

  describe('listIncidents', () => {
    it('should return paginated incidents', async () => {
      await createIncident(prisma, {
        title: 'Test Incident A',
        description: 'First test incident for listing with description',
        priority: Priority.P3,
        impact: Impact.MEDIUM,
        urgency: Urgency.MEDIUM,
        categoryId: testCategoryId,
        reportedById: testUserId,
      });

      await createIncident(prisma, {
        title: 'Test Incident B',
        description: 'Second test incident for listing with description',
        priority: Priority.P3,
        impact: Impact.MEDIUM,
        urgency: Urgency.MEDIUM,
        categoryId: testCategoryId,
        reportedById: testUserId,
      });

      const result = await listIncidents(prisma, { page: 1, limit: 10 });

      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const incident = await createIncident(prisma, {
        title: 'Test Incident C',
        description: 'Test incident for status filtering with description',
        priority: Priority.P3,
        impact: Impact.MEDIUM,
        urgency: Urgency.MEDIUM,
        categoryId: testCategoryId,
        reportedById: testUserId,
      });

      await prisma.incident.update({
        where: { id: incident.id },
        data: { status: IncidentStatus.IN_PROGRESS },
      });

      const result = await listIncidents(prisma, {
        page: 1,
        limit: 10,
        status: IncidentStatus.IN_PROGRESS,
      });

      expect(result.data.some(i => i.id === incident.id)).toBe(true);
      expect(result.data.every(i => i.status === IncidentStatus.IN_PROGRESS)).toBe(true);
    });
  });

  describe('updateIncident', () => {
    it('should update incident and log audit trail', async () => {
      const incident = await createIncident(prisma, {
        title: 'Test Incident D',
        description: 'Test incident for updating with sufficient description',
        priority: Priority.P3,
        impact: Impact.MEDIUM,
        urgency: Urgency.MEDIUM,
        categoryId: testCategoryId,
        reportedById: testUserId,
      });

      const updated = await updateIncident(
        prisma,
        incident.id,
        { status: IncidentStatus.IN_PROGRESS, title: 'Updated Test Incident D' },
        testUserId
      );

      expect(updated.status).toBe(IncidentStatus.IN_PROGRESS);
      expect(updated.title).toBe('Updated Test Incident D');

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'INCIDENT',
          entityId: incident.id,
          action: 'UPDATE',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('deleteIncident', () => {
    it('should soft delete incident', async () => {
      const incident = await createIncident(prisma, {
        title: 'Test Incident E',
        description: 'Test incident for deletion with sufficient description',
        priority: Priority.P3,
        impact: Impact.MEDIUM,
        urgency: Urgency.MEDIUM,
        categoryId: testCategoryId,
        reportedById: testUserId,
      });

      await deleteIncident(prisma, incident.id, testUserId);

      const deleted = await prisma.incident.findUnique({
        where: { id: incident.id },
      });

      expect(deleted?.deletedAt).not.toBeNull();
    });
  });
});
