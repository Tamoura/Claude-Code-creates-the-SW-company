import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
  getPrisma,
} from './helpers';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Mention Module', () => {
  describe('Auto-extraction on post creation', () => {
    it('extracts @mentions from post content and creates records', async () => {
      const app = await getApp();
      const author = await createTestUser(app, {
        email: 'mentionauthorpost@test.com',
        displayName: 'Author',
      });
      const mentioned = await createTestUser(app, {
        email: 'mentioneduser@test.com',
        displayName: 'MentionTarget',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(author.accessToken),
        payload: {
          content: `Hey @MentionTarget check this out!`,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.mentions).toHaveLength(1);
      expect(body.data.mentions[0].displayName).toBe(
        'MentionTarget'
      );

      // Verify mention record in DB
      const db = getPrisma();
      const mentions = await db.mention.findMany({
        where: { mentionedUserId: mentioned.id },
      });
      expect(mentions).toHaveLength(1);
      expect(mentions[0].offsetStart).toBeGreaterThanOrEqual(0);
      expect(mentions[0].offsetEnd).toBeGreaterThan(
        mentions[0].offsetStart
      );
    });

    it('creates notification for mentioned user', async () => {
      const app = await getApp();
      const author = await createTestUser(app, {
        email: 'notifauthor@test.com',
        displayName: 'NotifAuthor',
      });
      const mentioned = await createTestUser(app, {
        email: 'notifmentioned@test.com',
        displayName: 'NotifTarget',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(author.accessToken),
        payload: {
          content: 'Shoutout to @NotifTarget',
        },
      });

      // Check notification
      const db = getPrisma();
      const notifications = await db.notification.findMany({
        where: {
          userId: mentioned.id,
          type: 'MENTION',
        },
      });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toContain('mentioned');
    });

    it('does not create notification for self-mention', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'selfmention@test.com',
        displayName: 'SelfUser',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'I am @SelfUser and I mention myself',
        },
      });

      const db = getPrisma();
      const notifications = await db.notification.findMany({
        where: {
          userId: user.id,
          type: 'MENTION',
        },
      });
      expect(notifications).toHaveLength(0);
    });

    it('ignores @mentions that do not match any user', async () => {
      const app = await getApp();
      const user = await createTestUser(app, {
        email: 'badmention@test.com',
        displayName: 'RealUser',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Hello @NonExistentUser!',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.mentions).toHaveLength(0);

      const db = getPrisma();
      const mentions = await db.mention.findMany();
      expect(mentions).toHaveLength(0);
    });

    it('handles multiple mentions in one post', async () => {
      const app = await getApp();
      const author = await createTestUser(app, {
        email: 'multimentionauth@test.com',
        displayName: 'MultiAuthor',
      });
      const user1 = await createTestUser(app, {
        email: 'multimention1@test.com',
        displayName: 'UserAlpha',
      });
      const user2 = await createTestUser(app, {
        email: 'multimention2@test.com',
        displayName: 'UserBeta',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(author.accessToken),
        payload: {
          content: 'Thanks @UserAlpha and @UserBeta!',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.mentions).toHaveLength(2);

      const db = getPrisma();
      const mentions = await db.mention.findMany();
      expect(mentions).toHaveLength(2);
    });
  });

  describe('Mentions in comments', () => {
    it('extracts @mentions from comment content', async () => {
      const app = await getApp();
      const author = await createTestUser(app, {
        email: 'commentauthor@test.com',
        displayName: 'CommentAuth',
      });
      const mentioned = await createTestUser(app, {
        email: 'commentmentioned@test.com',
        displayName: 'CommentTarget',
      });

      // Create a post first
      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(author.accessToken),
        payload: { content: 'A post to comment on' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      // Add comment with mention
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/comment`,
        headers: authHeaders(author.accessToken),
        payload: {
          content: '@CommentTarget what do you think?',
        },
      });

      expect(res.statusCode).toBe(201);

      // Verify mention record links to comment
      const db = getPrisma();
      const mentions = await db.mention.findMany({
        where: { mentionedUserId: mentioned.id },
      });
      expect(mentions).toHaveLength(1);
      expect(mentions[0].commentId).not.toBeNull();
      expect(mentions[0].postId).toBeNull();
    });
  });
});
