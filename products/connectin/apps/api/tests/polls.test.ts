import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
} from './helpers';

let app: FastifyInstance;
let user: TestUser;
let voter: TestUser;

beforeAll(async () => {
  app = await getApp();
  await cleanDatabase();
  user = await createTestUser(app);
  voter = await createTestUser(app);
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Polls API', () => {
  let pollPostId: string;
  let pollId: string;
  let optionIds: string[];

  describe('POST /api/v1/feed/posts (with poll)', () => {
    it('should create a post with a poll', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'What is your favorite language?',
          poll: {
            question: 'Favorite programming language?',
            options: ['TypeScript', 'Python', 'Rust', 'Go'],
            durationDays: 7,
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.data.poll).toBeDefined();
      expect(json.data.poll.question).toBe('Favorite programming language?');
      expect(json.data.poll.options).toHaveLength(4);
      pollPostId = json.data.id;
      pollId = json.data.poll.id;
      optionIds = json.data.poll.options.map((o: { id: string }) => o.id);
    });

    it('should reject polls with fewer than 2 options', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Bad poll',
          poll: {
            question: 'Only one option?',
            options: ['Only one'],
            durationDays: 7,
          },
        },
      });

      expect(res.statusCode).toBe(422);
    });

    it('should reject polls with more than 4 options', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Too many options',
          poll: {
            question: 'Five options?',
            options: ['A', 'B', 'C', 'D', 'E'],
            durationDays: 7,
          },
        },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('POST /api/v1/polls/:pollId/vote', () => {
    it('should vote on a poll', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/polls/${pollId}/vote`,
        headers: authHeaders(voter.accessToken),
        payload: { optionId: optionIds[0] },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.data.optionId).toBe(optionIds[0]);
    });

    it('should not allow voting twice', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/polls/${pollId}/vote`,
        headers: authHeaders(voter.accessToken),
        payload: { optionId: optionIds[1] },
      });

      expect(res.statusCode).toBe(409);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/polls/${pollId}/vote`,
        payload: { optionId: optionIds[0] },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/polls/:pollId', () => {
    it('should return poll results', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/polls/${pollId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.totalVotes).toBe(1);
      expect(json.data.options[0].voteCount).toBe(1);
      expect(json.data.userVote).toBeNull(); // user hasn't voted
    });

    it('should show user vote if they voted', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/polls/${pollId}`,
        headers: authHeaders(voter.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.userVote).toBe(optionIds[0]);
    });
  });
});
