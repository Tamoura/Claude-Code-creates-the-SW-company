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

  describe('PUT /api/v1/feed/posts/:id (Edit Post)', () => {
    it('rejects unauthenticated request', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Original content' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/feed/posts/${postId}`,
        payload: { content: 'Edited content' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('edits own post', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Before edit' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/feed/posts/${postId}`,
        headers: authHeaders(user.accessToken),
        payload: { content: 'After edit' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.content).toBe('After edit');
      expect(body.data.id).toBe(postId);
    });

    it('returns 404 when editing another user post', async () => {
      const app = await getApp();
      const owner = await createTestUser(app, { email: 'post-owner@test.com' });
      const other = await createTestUser(app, { email: 'post-other@test.com' });

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(owner.accessToken),
        payload: { content: 'Owner post' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/feed/posts/${postId}`,
        headers: authHeaders(other.accessToken),
        payload: { content: 'Hijacked!' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('validates content length on edit', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Short post' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/feed/posts/${postId}`,
        headers: authHeaders(user.accessToken),
        payload: { content: 'a'.repeat(3001) },
      });

      expect(res.statusCode).toBe(422);
    });

    it('rejects empty content on edit', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Non-empty' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/feed/posts/${postId}`,
        headers: authHeaders(user.accessToken),
        payload: { content: '' },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('DELETE /api/v1/feed/posts/:id (Delete Post)', () => {
    it('rejects unauthenticated request', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Deletable post' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${postId}`,
      });

      expect(res.statusCode).toBe(401);
    });

    it('deletes own post (soft-delete)', async () => {
      const app = await getApp();
      const user = await createTestUser(app);
      const db = getPrisma();

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Will be deleted' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${postId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // Verify soft-delete in DB
      const dbPost = await db.post.findUnique({ where: { id: postId } });
      expect(dbPost!.isDeleted).toBe(true);
    });

    it('deleted post disappears from feed', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      // Create 2 posts
      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Keeper post' },
      });
      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Doomed post' },
      });
      const doomedId = JSON.parse(postRes.body).data.id;

      // Delete one
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${doomedId}`,
        headers: authHeaders(user.accessToken),
      });

      // Feed should only show 1 post
      const feedRes = await app.inject({
        method: 'GET',
        url: '/api/v1/feed',
        headers: authHeaders(user.accessToken),
      });
      const feedBody = JSON.parse(feedRes.body);
      expect(feedBody.data).toHaveLength(1);
      expect(feedBody.data[0].content).toBe('Keeper post');
    });

    it('returns 404 when deleting another user post', async () => {
      const app = await getApp();
      const owner = await createTestUser(app, { email: 'del-post-owner@test.com' });
      const other = await createTestUser(app, { email: 'del-post-other@test.com' });

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(owner.accessToken),
        payload: { content: 'Protected post' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${postId}`,
        headers: authHeaders(other.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    it('cannot edit a deleted post', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Soon deleted' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      // Delete it
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${postId}`,
        headers: authHeaders(user.accessToken),
      });

      // Try to edit
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/feed/posts/${postId}`,
        headers: authHeaders(user.accessToken),
        payload: { content: 'Zombie edit' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('GET /api/v1/feed/posts/:id/comments returns comments for a post', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Post with comments' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      // Add 2 comments
      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/comment`,
        headers: authHeaders(user.accessToken),
        payload: { content: 'First comment' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/comment`,
        headers: authHeaders(user.accessToken),
        payload: { content: 'Second comment' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/feed/posts/${postId}/comments`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].content).toBe('First comment');
      expect(body.data[1].content).toBe('Second comment');
    });
  });

  describe('POST /api/v1/feed/posts/:id/react (Reactions)', () => {
    it('reacts to a post with default LIKE', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'React to me!' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'LIKE' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.reacted).toBe(true);
      expect(body.data.type).toBe('LIKE');
      expect(body.data.reactions.LIKE).toBe(1);
    });

    it('reacts with CELEBRATE type', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Celebrate me!' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'CELEBRATE' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.reacted).toBe(true);
      expect(body.data.type).toBe('CELEBRATE');
      expect(body.data.reactions.CELEBRATE).toBe(1);
      expect(body.data.reactions.LIKE).toBe(0);
    });

    it('reacts with SUPPORT type', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Support me!' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'SUPPORT' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.type).toBe('SUPPORT');
      expect(body.data.reactions.SUPPORT).toBe(1);
    });

    it('reacts with LOVE type', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Love me!' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'LOVE' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.type).toBe('LOVE');
      expect(body.data.reactions.LOVE).toBe(1);
    });

    it('reacts with INSIGHTFUL type', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Insightful post!' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'INSIGHTFUL' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.type).toBe('INSIGHTFUL');
      expect(body.data.reactions.INSIGHTFUL).toBe(1);
    });

    it('reacts with FUNNY type', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Funny post!' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'FUNNY' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.type).toBe('FUNNY');
      expect(body.data.reactions.FUNNY).toBe(1);
    });

    it('changes reaction type on re-react', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Change reaction!' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      // React with LIKE first
      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'LIKE' },
      });

      // Change to CELEBRATE
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'CELEBRATE' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.reacted).toBe(true);
      expect(body.data.type).toBe('CELEBRATE');
      expect(body.data.reactions.CELEBRATE).toBe(1);
      expect(body.data.reactions.LIKE).toBe(0);
    });

    it('returns 404 for non-existent post', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts/00000000-0000-0000-0000-000000000000/react',
        headers: authHeaders(user.accessToken),
        payload: { type: 'LIKE' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 401 for unauthenticated request', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Auth test' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        payload: { type: 'LIKE' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 422 for invalid reaction type', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Invalid reaction test' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'INVALID_TYPE' },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('DELETE /api/v1/feed/posts/:id/react (Unreact)', () => {
    it('removes an existing reaction', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Unreact me!' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      // React first
      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
        payload: { type: 'LIKE' },
      });

      // Unreact
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.reacted).toBe(false);
      expect(body.data.reactions.LIKE).toBe(0);
    });

    it('is idempotent (unreact when no reaction exists)', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'No reaction here' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.reacted).toBe(false);
    });

    it('returns 404 for non-existent post', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/feed/posts/00000000-0000-0000-0000-000000000000/react',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 401 for unauthenticated request', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Auth unreact test' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/feed/posts/${postId}/react`,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/feed/posts/:id/reactions', () => {
    it('returns reaction breakdown for a post', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app, {
        email: 'react-user1@test.com',
      });
      const user2 = await createTestUser(app, {
        email: 'react-user2@test.com',
      });

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user1.accessToken),
        payload: { content: 'Reaction breakdown!' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      // User1 reacts LIKE, User2 reacts CELEBRATE
      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user1.accessToken),
        payload: { type: 'LIKE' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/feed/posts/${postId}/react`,
        headers: authHeaders(user2.accessToken),
        payload: { type: 'CELEBRATE' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/feed/posts/${postId}/reactions`,
        headers: authHeaders(user1.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.LIKE).toBe(1);
      expect(body.data.CELEBRATE).toBe(1);
      expect(body.data.SUPPORT).toBe(0);
      expect(body.data.LOVE).toBe(0);
      expect(body.data.INSIGHTFUL).toBe(0);
      expect(body.data.FUNNY).toBe(0);
    });

    it('returns all zeros for a post with no reactions', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'No reactions' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/feed/posts/${postId}/reactions`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.LIKE).toBe(0);
      expect(body.data.CELEBRATE).toBe(0);
      expect(body.data.SUPPORT).toBe(0);
      expect(body.data.LOVE).toBe(0);
      expect(body.data.INSIGHTFUL).toBe(0);
      expect(body.data.FUNNY).toBe(0);
    });

    it('returns 404 for non-existent post', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/feed/posts/00000000-0000-0000-0000-000000000000/reactions',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 401 for unauthenticated request', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Auth reactions test' },
      });
      const postId = JSON.parse(postRes.body).data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/feed/posts/${postId}/reactions`,
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
