import { FastifyInstance } from 'fastify';
import { buildTestApp, resetDatabase, registerUser } from '../setup';

describe('Task Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a task and return 201', async () => {
      const { token } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'My first task',
          description: 'A detailed description',
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.task).toBeDefined();
      expect(body.task.id).toBeDefined();
      expect(body.task.title).toBe('My first task');
      expect(body.task.description).toBe('A detailed description');
      expect(body.task.completed).toBe(false);
      expect(body.task.createdAt).toBeDefined();
      expect(body.task.updatedAt).toBeDefined();
    });

    it('should return 400 when title is empty', async () => {
      const { token } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: '',
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should return 400 when title exceeds 200 characters', async () => {
      const { token } = await registerUser(app);

      const longTitle = 'a'.repeat(201);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: longTitle,
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should return only the authenticated user tasks (user isolation)', async () => {
      // Create two users
      const { token: token1 } = await registerUser(app, 'user1@example.com', 'password123');
      const { token: token2 } = await registerUser(app, 'user2@example.com', 'password123');

      // User 1 creates 2 tasks
      await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token1}` },
        payload: { title: 'User1 Task 1' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token1}` },
        payload: { title: 'User1 Task 2' },
      });

      // User 2 creates 1 task
      await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token2}` },
        payload: { title: 'User2 Task 1' },
      });

      // User 1 should only see their own 2 tasks
      const response1 = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token1}` },
      });

      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);
      expect(body1.tasks).toHaveLength(2);
      expect(body1.tasks[0].title).toBe('User1 Task 2'); // desc order
      expect(body1.tasks[1].title).toBe('User1 Task 1');

      // User 2 should only see their own 1 task
      const response2 = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token2}` },
      });

      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body2.tasks).toHaveLength(1);
      expect(body2.tasks[0].title).toBe('User2 Task 1');
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    it('should update a task and return 200 with updated fields', async () => {
      const { token } = await registerUser(app);

      // Create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'Original title', description: 'Original description' },
      });
      const { task: createdTask } = JSON.parse(createResponse.body);

      // Update the task
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/tasks/${createdTask.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'Updated title',
          description: 'Updated description',
          completed: true,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.task.title).toBe('Updated title');
      expect(body.task.description).toBe('Updated description');
      expect(body.task.completed).toBe(true);
    });

    it('should return 404 when updating a non-existent task', async () => {
      const { token } = await registerUser(app);

      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/tasks/${fakeId}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'Updated title' },
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should delete a task and return 200, task gone from list', async () => {
      const { token } = await registerUser(app);

      // Create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'Task to delete' },
      });
      const { task: createdTask } = JSON.parse(createResponse.body);

      // Delete it
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tasks/${createdTask.id}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(deleteResponse.statusCode).toBe(200);

      // Verify it's gone
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token}` },
      });

      const listBody = JSON.parse(listResponse.body);
      expect(listBody.tasks).toHaveLength(0);
    });

    it('should return 404 when deleting a non-existent task', async () => {
      const { token } = await registerUser(app);

      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tasks/${fakeId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/tasks/stats', () => {
    it('should return correct counts (total, completed, pending)', async () => {
      const { token } = await registerUser(app);

      // Create 3 tasks
      const task1Res = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'Task 1' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'Task 2' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'Task 3' },
      });

      // Complete 1 task
      const { task: task1 } = JSON.parse(task1Res.body);
      await app.inject({
        method: 'PUT',
        url: `/api/v1/tasks/${task1.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { completed: true },
      });

      // Get stats
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/stats',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.total).toBe(3);
      expect(body.completed).toBe(1);
      expect(body.pending).toBe(2);
    });
  });
});
