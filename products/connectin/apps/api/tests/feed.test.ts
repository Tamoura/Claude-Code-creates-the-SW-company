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

describe('Feed Module', () => {
  describe('POST /api/v1/feed/posts', () => {
    it('creates a post', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Hello ConnectIn! My first post.',
          textDirection: 'AUTO',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.content).toBe(
        'Hello ConnectIn! My first post.'
      );
      expect(body.data.likeCount).toBe(0);
      expect(body.data.commentCount).toBe(0);
      expect(body.data.isLikedByMe).toBe(false);
      expect(body.data.author.id).toBe(user.id);
    });

    it('validates content length', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'a'.repeat(3001),
        },
      });

      expect(res.statusCode).toBe(422);
    });

    it('rejects empty content', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: '' },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('GET /api/v1/feed', () => {
    it('returns feed with posts', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      // Create multiple posts
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/feed/posts',
          headers: authHeaders(user.accessToken),
          payload: { content: `Post number ${i + 1}` },
        });
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/feed',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
      expect(body.meta.count).toBe(3);
      // Newest first
      expect(body.data[0].content).toBe(
        'Post number 3'
      );
    });

    it('supports cursor-based pagination',
      async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        // Create 5 posts
        for (let i = 0; i < 5; i++) {
          await app.inject({
            method: 'POST',
            url: '/api/v1/feed/posts',
            headers: authHeaders(user.accessToken),
            payload: { content: `Paginated post ${i + 1}` },
          });
        }

        // First page (limit 3)
        const page1 = await app.inject({
          method: 'GET',
          url: '/api/v1/feed?limit=3',
          headers: authHeaders(user.accessToken),
        });

        const page1Body = JSON.parse(page1.body);
        expect(page1Body.data).toHaveLength(3);
        expect(page1Body.meta.hasMore).toBe(true);
        expect(page1Body.meta.cursor).toBeDefined();

        // Second page
        const page2 = await app.inject({
          method: 'GET',
          url: `/api/v1/feed?limit=3&cursor=${page1Body.meta.cursor}`,
          headers: authHeaders(user.accessToken),
        });

        const page2Body = JSON.parse(page2.body);
        expect(page2Body.data).toHaveLength(2);
        expect(page2Body.meta.hasMore).toBe(false);
      }
    );
  });

  describe('POST /api/v1/feed/posts/:id/like', () => {
    it('likes a post', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Like me!' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/like`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.liked).toBe(true);
      expect(body.data.likeCount).toBe(1);
    });

    it('is idempotent (liking twice is ok)',
      async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        const postRes = await app.inject({
          method: 'POST',
          url: '/api/v1/feed/posts',
          headers: authHeaders(user.accessToken),
          payload: { content: 'Idempotent like' },
        });
        const postId = JSON.parse(postRes.body).data.id;

        // Like twice
        await app.inject({
          method: 'POST',
          url: `/api/v1/feed/posts/${postId}/like`,
          headers: authHeaders(user.accessToken),
        });

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/feed/posts/${postId}/like`,
          headers: authHeaders(user.accessToken),
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.liked).toBe(true);
        expect(body.data.likeCount).toBe(1);
      }
    );

    it('unlike removes the like', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Unlike me' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      // Like
      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/like`,
        headers: authHeaders(user.accessToken),
      });

      // Unlike
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${postId}/like`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.liked).toBe(false);
      expect(body.data.likeCount).toBe(0);
    });
  });

  describe('Like/unlike count accuracy (RISK-013)', () => {
    it('like returns count matching DB state', async () => {
      const app = await getApp();
      const user = await createTestUser(app);
      const db = getPrisma();

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Count accuracy test' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const likeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/like`,
        headers: authHeaders(user.accessToken),
      });

      const body = JSON.parse(likeRes.body);
      const dbPost = await db.post.findUnique({
        where: { id: postId },
      });

      expect(body.data.likeCount).toBe(dbPost!.likeCount);
    });

    it('unlike returns count matching DB state', async () => {
      const app = await getApp();
      const user = await createTestUser(app);
      const db = getPrisma();

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Unlike count accuracy' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      // Like then unlike
      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/like`,
        headers: authHeaders(user.accessToken),
      });

      const unlikeRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${postId}/like`,
        headers: authHeaders(user.accessToken),
      });

      const body = JSON.parse(unlikeRes.body);
      const dbPost = await db.post.findUnique({
        where: { id: postId },
      });

      expect(body.data.likeCount).toBe(dbPost!.likeCount);
    });

    it('concurrent likes return accurate counts', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user1.accessToken),
        payload: { content: 'Concurrent likes test' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      // Both users like the post
      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/like`,
        headers: authHeaders(user1.accessToken),
      });
      const secondLike = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/like`,
        headers: authHeaders(user2.accessToken),
      });

      const body = JSON.parse(secondLike.body);
      expect(body.data.likeCount).toBe(2);
    });
  });

  describe(
    'POST /api/v1/feed/posts/:id/comment',
    () => {
      it('adds a comment to a post', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        const postRes = await app.inject({
          method: 'POST',
          url: '/api/v1/feed/posts',
          headers: authHeaders(user.accessToken),
          payload: { content: 'Comment on me!' },
        });
        const postId = JSON.parse(postRes.body).data.id;

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/feed/posts/${postId}/comment`,
          headers: authHeaders(user.accessToken),
          payload: { content: 'Great post!' },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body.data.content).toBe('Great post!');
        expect(body.data.postId).toBe(postId);
        expect(body.data.authorId).toBe(user.id);
      });

      it('validates comment length', async () => {
        const app = await getApp();
        const user = await createTestUser(app);

        const postRes = await app.inject({
          method: 'POST',
          url: '/api/v1/feed/posts',
          headers: authHeaders(user.accessToken),
          payload: { content: 'A post' },
        });
        const postId = JSON.parse(postRes.body).data.id;

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/feed/posts/${postId}/comment`,
          headers: authHeaders(user.accessToken),
          payload: { content: 'a'.repeat(1001) },
        });

        expect(res.statusCode).toBe(422);
      });

      it('returns 404 for non-existent post',
        async () => {
          const app = await getApp();
          const user = await createTestUser(app);

          const res = await app.inject({
            method: 'POST',
            url: '/api/v1/feed/posts/00000000-0000-0000-0000-000000000000/comment',
            headers: authHeaders(user.accessToken),
            payload: { content: 'Ghost comment' },
          });

          expect(res.statusCode).toBe(404);
        }
      );
    }
  );
});
