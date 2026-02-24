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
let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  app = await getApp();
});

afterAll(async () => {
  await closeApp();
});

beforeEach(async () => {
  await cleanDatabase();
  alice = await createTestUser(app, { displayName: 'Alice' });
  bob = await createTestUser(app, { displayName: 'Bob' });
});

describe('Articles', () => {
  it('should create an article', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/articles',
      headers: authHeaders(alice.accessToken),
      payload: {
        title: 'The Future of Arabic AI',
        content: 'Long form content here about the future of Arabic AI...',
        coverImageUrl: 'https://example.com/cover.jpg',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe('The Future of Arabic AI');
    expect(body.data.status).toBe('DRAFT');
    expect(body.data.slug).toBeDefined();
  });

  it('should publish an article', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/articles',
      headers: authHeaders(alice.accessToken),
      payload: {
        title: 'Draft Article',
        content: 'Some content',
      },
    });
    const articleId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/articles/${articleId}`,
      headers: authHeaders(alice.accessToken),
      payload: { status: 'PUBLISHED' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('PUBLISHED');
    expect(body.data.publishedAt).toBeDefined();
  });

  it('should list published articles', async () => {
    // Create and publish
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/articles',
      headers: authHeaders(alice.accessToken),
      payload: { title: 'Published One', content: 'Content here' },
    });
    const articleId = JSON.parse(createRes.body).data.id;
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/articles/${articleId}`,
      headers: authHeaders(alice.accessToken),
      payload: { status: 'PUBLISHED' },
    });

    // Create draft (should not appear in public list)
    await app.inject({
      method: 'POST',
      url: '/api/v1/articles',
      headers: authHeaders(alice.accessToken),
      payload: { title: 'Draft Only', content: 'Draft content' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/articles',
      headers: authHeaders(bob.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Published One');
  });

  it('should get article by id', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/articles',
      headers: authHeaders(alice.accessToken),
      payload: { title: 'My Article', content: 'Full content' },
    });
    const articleId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/articles/${articleId}`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe('My Article');
    expect(body.data.author).toBeDefined();
  });

  it('should reject non-author update', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/articles',
      headers: authHeaders(alice.accessToken),
      payload: { title: 'Alice Article', content: 'Content' },
    });
    const articleId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/articles/${articleId}`,
      headers: authHeaders(bob.accessToken),
      payload: { title: 'Hacked Title' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('should delete own article', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/articles',
      headers: authHeaders(alice.accessToken),
      payload: { title: 'To Delete', content: 'Delete me' },
    });
    const articleId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/articles/${articleId}`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('should list author articles (including drafts)', async () => {
    // Create draft
    await app.inject({
      method: 'POST',
      url: '/api/v1/articles',
      headers: authHeaders(alice.accessToken),
      payload: { title: 'My Draft', content: 'Draft' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/articles/user/${alice.id}`,
      headers: authHeaders(alice.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
  });

  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/articles',
    });
    expect(res.statusCode).toBe(401);
  });
});
