// TODO: Test database isolation - These tests currently share the development
// database which causes displayId collisions. Need to implement separate test
// database with proper cleanup. See GitHub issue #22

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient, Priority, ProblemStatus } from '@prisma/client';
import {
  createProblem,
  getProblem,
  listProblems,
  updateProblem,
  deleteProblem,
  linkIncidentToProblem,
  createKnownError,
} from '../../src/services/problem.service.js';

const prisma = new PrismaClient();

describe('Problem Service', () => {
  let testCategoryId: string;
  let testUserId: string;
  let testRoleId: string;
  let testIncidentId: string;

  beforeEach(async () => {
    // Clean up test data in correct order: children first, parents last
    // Delete by displayId to catch any orphaned records from previous runs
    await prisma.knownError.deleteMany({
      where: { problem: { displayId: { gte: 'PRB-00003' } } },
    });
    await prisma.problemIncident.deleteMany({
      where: { problem: { displayId: { gte: 'PRB-00003' } } },
    });
    await prisma.problem.deleteMany({
      where: { displayId: { gte: 'PRB-00003' } }, // Seed creates PRB-00001 to PRB-00002
    });
    await prisma.incident.deleteMany({
      where: { title: { contains: 'Test Problem Incident' } },
    });
    // Clean up test user and role AFTER all entities that reference them are deleted
    await prisma.user.deleteMany({
      where: { email: { contains: 'problemtest@' } },
    });
    await prisma.role.deleteMany({
      where: { name: { contains: 'Problem Test' } },
    });
    // Don't reset sequences - just work with existing data
    // Tests should work regardless of existing sequence values

    // Create test role
    const role = await prisma.role.create({
      data: {
        name: 'Problem Test Role',
        description: 'Test role',
        level: 1,
      },
    });
    testRoleId = role.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'problemtest@example.com',
        passwordHash: 'hashed',
        firstName: 'Problem',
        lastName: 'Tester',
        roleId: testRoleId,
      },
    });
    testUserId = user.id;

    // Reuse existing category from seed data (don't create/delete to avoid FK issues)
    const category = await prisma.category.findFirst({
      where: { name: 'Hardware', type: 'INCIDENT' }, // Reuse incident category for problems
    });
    if (!category) {
      throw new Error('Seed data missing: Hardware category not found. Run: npm run db:seed');
    }
    testCategoryId = category.id;

    // Create test incident
    const incident = await prisma.incident.create({
      data: {
        displayId: 'INC-TEST-001',
        title: 'Test Problem Incident',
        description: 'Test incident for problem linking with enough description',
        priority: Priority.P3,
        impact: 'MEDIUM',
        urgency: 'MEDIUM',
        categoryId: testCategoryId,
        reportedById: testUserId,
        status: 'NEW',
      },
    });
    testIncidentId = incident.id;
  });

  afterAll(async () => {
    // Clean up all test data after all tests complete
    // Delete in correct order: children first, parents last
    await prisma.knownError.deleteMany({
      where: { problem: { title: { contains: 'Test Problem' } } },
    });
    await prisma.problemIncident.deleteMany({
      where: { problem: { title: { contains: 'Test Problem' } } },
    });
    await prisma.problem.deleteMany({
      where: { title: { contains: 'Test Problem' } },
    });
    await prisma.incident.deleteMany({
      where: { displayId: 'INC-TEST-001' },
    });
    await prisma.user.deleteMany({
      where: { email: 'problemtest@example.com' },
    });
    await prisma.role.deleteMany({
      where: { name: 'Problem Test Role' },
    });
    // Don't delete category as it's shared seed data
  });

  describe('createProblem', () => {
    it('should create problem with generated display ID', async () => {
      const problem = await createProblem(prisma, {
        title: 'Test Problem 1',
        description: 'This is a test problem with sufficient description to meet validation requirements',
        priority: Priority.P2,
        categoryId: testCategoryId,
        createdById: testUserId,
      });

      expect(problem.displayId).toMatch(/^PRB-\d{5}$/);
      expect(problem.title).toBe('Test Problem 1');
      expect(problem.priority).toBe(Priority.P2);
      expect(problem.status).toBe(ProblemStatus.NEW);
    });

    it('should log audit trail on creation', async () => {
      const problem = await createProblem(prisma, {
        title: 'Test Problem 2',
        description: 'Another test problem with sufficient description for validation requirements',
        priority: Priority.P1,
        categoryId: testCategoryId,
        createdById: testUserId,
      });

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'PROBLEM',
          entityId: problem.id,
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe('CREATE');
    });
  });

  describe('getProblem', () => {
    it('should return problem by ID with relations', async () => {
      const created = await createProblem(prisma, {
        title: 'Test Problem 3',
        description: 'Test problem for retrieval with sufficient description text for validation',
        priority: Priority.P3,
        categoryId: testCategoryId,
        createdById: testUserId,
      });

      const problem = await getProblem(prisma, created.id);

      expect(problem).not.toBeNull();
      expect(problem?.id).toBe(created.id);
      expect(problem?.title).toBe('Test Problem 3');
      expect(problem?.category).toBeDefined();
      expect(problem?.createdBy).toBeDefined();
    });

    it('should return null for non-existent problem', async () => {
      const problem = await getProblem(prisma, 'non-existent-id');
      expect(problem).toBeNull();
    });
  });

  describe('listProblems', () => {
    it('should return paginated problems', async () => {
      await createProblem(prisma, {
        title: 'Test Problem A',
        description: 'First test problem for listing with sufficient description text',
        priority: Priority.P2,
        categoryId: testCategoryId,
        createdById: testUserId,
      });

      await createProblem(prisma, {
        title: 'Test Problem B',
        description: 'Second test problem for listing with sufficient description text',
        priority: Priority.P2,
        categoryId: testCategoryId,
        createdById: testUserId,
      });

      const result = await listProblems(prisma, { page: 1, limit: 10 });

      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter by status', async () => {
      const problem = await createProblem(prisma, {
        title: 'Test Problem C',
        description: 'Test problem for status filtering with sufficient description',
        priority: Priority.P2,
        categoryId: testCategoryId,
        createdById: testUserId,
      });

      await prisma.problem.update({
        where: { id: problem.id },
        data: { status: ProblemStatus.UNDER_INVESTIGATION },
      });

      const result = await listProblems(prisma, {
        page: 1,
        limit: 10,
        status: ProblemStatus.UNDER_INVESTIGATION,
      });

      expect(result.data.some((p) => p.id === problem.id)).toBe(true);
      expect(result.data.every((p) => p.status === ProblemStatus.UNDER_INVESTIGATION)).toBe(true);
    });
  });

  describe('updateProblem', () => {
    it('should update problem and log audit trail', async () => {
      const problem = await createProblem(prisma, {
        title: 'Test Problem D',
        description: 'Test problem for updating with sufficient description text',
        priority: Priority.P3,
        categoryId: testCategoryId,
        createdById: testUserId,
      });

      const updated = await updateProblem(
        prisma,
        problem.id,
        {
          status: ProblemStatus.UNDER_INVESTIGATION,
          rootCause: 'Database connection pool exhaustion',
        },
        testUserId
      );

      expect(updated.status).toBe(ProblemStatus.UNDER_INVESTIGATION);
      expect(updated.rootCause).toBe('Database connection pool exhaustion');

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'PROBLEM',
          entityId: problem.id,
          action: 'UPDATE',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('deleteProblem', () => {
    it('should soft delete problem', async () => {
      const problem = await createProblem(prisma, {
        title: 'Test Problem E',
        description: 'Test problem for deletion with sufficient description text',
        priority: Priority.P3,
        categoryId: testCategoryId,
        createdById: testUserId,
      });

      await deleteProblem(prisma, problem.id, testUserId);

      const deleted = await prisma.problem.findUnique({
        where: { id: problem.id },
      });

      expect(deleted?.deletedAt).not.toBeNull();
    });
  });

  describe('linkIncidentToProblem', () => {
    it('should link incident to problem', async () => {
      const problem = await createProblem(prisma, {
        title: 'Test Problem F',
        description: 'Test problem for incident linking with sufficient description',
        priority: Priority.P2,
        categoryId: testCategoryId,
        createdById: testUserId,
      });

      const link = await linkIncidentToProblem(
        prisma,
        problem.id,
        testIncidentId,
        testUserId
      );

      expect(link.problemId).toBe(problem.id);
      expect(link.incidentId).toBe(testIncidentId);
      expect(link.linkedById).toBe(testUserId);
    });

    it('should not duplicate incident links', async () => {
      const problem = await createProblem(prisma, {
        title: 'Test Problem G',
        description: 'Test problem for duplicate link prevention with description',
        priority: Priority.P2,
        categoryId: testCategoryId,
        createdById: testUserId,
      });

      await linkIncidentToProblem(prisma, problem.id, testIncidentId, testUserId);

      // Try to link again
      await expect(
        linkIncidentToProblem(prisma, problem.id, testIncidentId, testUserId)
      ).rejects.toThrow();
    });
  });

  describe('createKnownError', () => {
    it('should create known error from problem', async () => {
      const problem = await createProblem(prisma, {
        title: 'Test Problem H',
        description: 'Test problem for known error creation with description',
        priority: Priority.P2,
        categoryId: testCategoryId,
        createdById: testUserId,
      });

      const knownError = await createKnownError(prisma, problem.id, {
        title: 'KEDb: Database Connection Pool Exhaustion',
        description: 'Connection pool reaches maximum capacity during peak hours',
        workaround: 'Restart the application server to clear the pool',
        affectedSystems: ['Production API', 'Staging API'],
      });

      expect(knownError.problemId).toBe(problem.id);
      expect(knownError.title).toContain('Database Connection Pool');
      expect(knownError.isActive).toBe(true);
    });
  });
});
