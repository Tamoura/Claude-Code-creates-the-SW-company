import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../helpers/db';

/**
 * Integration tests for the task API. Every acceptance criterion in
 * docs/specs/001-task-crud/spec.md has at least one test here — the
 * traceability tag in each title is what `.claude/scripts/traceability-gate.sh`
 * looks for.
 */
describe('tasks API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createProject(name = 'Demo'): Promise<string> {
    const project = await prisma.project.create({ data: { name } });
    return project.id;
  }

  describe('POST /api/v1/tasks', () => {
    it('creates a task in an existing project [US-01][AC-1]', async () => {
      const projectId = await createProject();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        payload: { title: 'Write the spec', projectId },
      });

      expect(response.statusCode).toBe(201);
      const { task } = response.json();
      expect(task).toMatchObject({ title: 'Write the spec', status: 'TODO', projectId });

      const persisted = await prisma.task.findUnique({ where: { id: task.id } });
      expect(persisted).not.toBeNull();
    });

    it('rejects an empty title with 422 [US-01][AC-2]', async () => {
      const projectId = await createProject();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        payload: { title: '   ', projectId },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json().code).toBe('VALIDATION_FAILED');
      expect(await prisma.task.count()).toBe(0);
    });

    it('rejects an unknown project with 404 [US-01][AC-3]', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        payload: { title: 'Orphan', projectId: '11111111-1111-4111-8111-111111111111' },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe('NOT_FOUND');
    });

    it('rejects a due date in the past with 400 [US-02][AC-4]', async () => {
      const projectId = await createProject();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        payload: { title: 'Late', projectId, dueDate: '2020-01-01T00:00:00.000Z' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('filters by status and paginates [US-02][AC-5]', async () => {
      const projectId = await createProject();
      await prisma.task.createMany({
        data: [
          { title: 'a', projectId, status: 'TODO' },
          { title: 'b', projectId, status: 'DONE' },
          { title: 'c', projectId, status: 'TODO' },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks?status=TODO&limit=1',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tasks).toHaveLength(1);
      expect(body.total).toBe(2);
      expect(body.limit).toBe(1);
    });

    it('returns 404 for an unknown task id [US-02][AC-6]', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/22222222-2222-4222-8222-222222222222',
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 422 for a malformed id [US-02][AC-7]', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/tasks/not-a-uuid' });

      expect(response.statusCode).toBe(422);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('updates a task that is still open [US-02][AC-8]', async () => {
      const projectId = await createProject();
      const task = await prisma.task.create({ data: { title: 'Draft', projectId } });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${task.id}`,
        payload: { status: 'IN_PROGRESS' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().task.status).toBe('IN_PROGRESS');
    });

    it('refuses to edit a completed task in place [US-02][AC-9]', async () => {
      const projectId = await createProject();
      const task = await prisma.task.create({
        data: { title: 'Shipped', projectId, status: 'DONE' },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${task.id}`,
        payload: { title: 'Shipped (edited)' },
      });

      expect(response.statusCode).toBe(400);
      const persisted = await prisma.task.findUnique({ where: { id: task.id } });
      expect(persisted?.title).toBe('Shipped');
    });

    it('allows a completed task to be reopened [US-02][AC-10]', async () => {
      const projectId = await createProject();
      const task = await prisma.task.create({
        data: { title: 'Shipped', projectId, status: 'DONE' },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${task.id}`,
        payload: { status: 'TODO' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().task.status).toBe('TODO');
    });

    it('rejects an empty patch body [US-02][AC-11]', async () => {
      const projectId = await createProject();
      const task = await prisma.task.create({ data: { title: 'Draft', projectId } });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${task.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(422);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('deletes a task and is not idempotent on a second call [US-02][AC-12]', async () => {
      const projectId = await createProject();
      const task = await prisma.task.create({ data: { title: 'Temporary', projectId } });

      const first = await app.inject({ method: 'DELETE', url: `/api/v1/tasks/${task.id}` });
      const second = await app.inject({ method: 'DELETE', url: `/api/v1/tasks/${task.id}` });

      expect(first.statusCode).toBe(204);
      expect(second.statusCode).toBe(404);
      expect(await prisma.task.count()).toBe(0);
    });
  });

  describe('cascade behaviour', () => {
    it('removes tasks when their project is deleted [US-03][AC-13]', async () => {
      const projectId = await createProject('Doomed');
      await prisma.task.create({ data: { title: 'Attached', projectId } });

      await prisma.project.delete({ where: { id: projectId } });

      expect(await prisma.task.count()).toBe(0);
    });
  });

  describe('projects', () => {
    it('creates a project [US-03][AC-20]', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: { name: 'Roadmap' },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().project).toMatchObject({ name: 'Roadmap' });
    });

    it('rejects a duplicate project name with 409 [US-03][AC-21]', async () => {
      await createProject('Roadmap');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: { name: 'Roadmap' },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().code).toBe('CONFLICT');
    });

    it('rejects a blank project name with 422 [US-03][AC-22]', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: { name: '  ' },
      });

      expect(response.statusCode).toBe(422);
    });

    it('lists projects alphabetically [US-03][AC-23]', async () => {
      await createProject('Beta');
      await createProject('Alpha');

      const response = await app.inject({ method: 'GET', url: '/api/v1/projects' });

      expect(response.statusCode).toBe(200);
      expect(response.json().projects.map((p: { name: string }) => p.name)).toEqual([
        'Alpha',
        'Beta',
      ]);
    });
  });

  describe('unfiltered listing and unknown routes', () => {
    it('returns every task when no filter is given [US-02][AC-24]', async () => {
      const projectId = await createProject();
      await prisma.task.createMany({
        data: [
          { title: 'a', projectId, status: 'TODO' },
          { title: 'b', projectId, status: 'DONE' },
        ],
      });

      const response = await app.inject({ method: 'GET', url: '/api/v1/tasks' });

      expect(response.statusCode).toBe(200);
      expect(response.json().total).toBe(2);
    });

    it('filters by projectId [US-02][AC-25]', async () => {
      const mine = await createProject('Mine');
      const theirs = await createProject('Theirs');
      await prisma.task.create({ data: { title: 'mine', projectId: mine } });
      await prisma.task.create({ data: { title: 'theirs', projectId: theirs } });

      const response = await app.inject({ method: 'GET', url: `/api/v1/tasks?projectId=${mine}` });

      expect(response.json().total).toBe(1);
      expect(response.json().tasks[0].title).toBe('mine');
    });

    it('answers problem+json for an unknown route [NFR-001][AC-26]', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/nope' });

      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/health', () => {
    it('reports the database as up [NFR-002]', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: 'ok', database: 'up' });
    });
  });
});
