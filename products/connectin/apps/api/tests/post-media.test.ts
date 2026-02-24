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

beforeAll(async () => {
  app = await getApp();
  await cleanDatabase();
  user = await createTestUser(app);
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

function createPngBuffer(): Buffer {
  return Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000a49444154789c6260000000060005012769b400000000049454e44ae426082',
    'hex'
  );
}

function buildMultipartPayload(
  fieldName: string,
  filename: string,
  mimeType: string,
  fileBuffer: Buffer,
  extraFields?: Record<string, string>
): { body: Buffer; contentType: string } {
  const boundary = '----FormBoundary' + Date.now();
  const parts: Buffer[] = [];

  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  ));
  parts.push(fileBuffer);
  parts.push(Buffer.from('\r\n'));

  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
        `${value}\r\n`
      ));
    }
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function uploadMedia(token: string): Promise<string> {
  const png = createPngBuffer();
  const { body, contentType } = buildMultipartPayload(
    'file', 'test.png', 'image/png', png,
    { type: 'IMAGE' }
  );

  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/media/upload',
    headers: {
      ...authHeaders(token),
      'content-type': contentType,
    },
    payload: body,
  });

  return JSON.parse(res.body).data.id;
}

describe('Post with Media API', () => {
  describe('POST /api/v1/feed/posts with mediaIds', () => {
    it('should create a post with media attachments', async () => {
      const mediaId = await uploadMedia(user.accessToken);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Check out this image!',
          mediaIds: [mediaId],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.data.media).toBeDefined();
      expect(json.data.media).toHaveLength(1);
      expect(json.data.media[0].id).toBe(mediaId);
      expect(json.data.media[0].url).toBeDefined();
    });

    it('should create a post with multiple images (up to 4)', async () => {
      const mediaId1 = await uploadMedia(user.accessToken);
      const mediaId2 = await uploadMedia(user.accessToken);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Multiple images!',
          mediaIds: [mediaId1, mediaId2],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.data.media).toHaveLength(2);
    });

    it('should reject more than 4 media attachments', async () => {
      const ids = [];
      for (let i = 0; i < 5; i++) {
        ids.push(await uploadMedia(user.accessToken));
      }

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Too many images!',
          mediaIds: ids,
        },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('GET /api/v1/feed (feed with media)', () => {
    it('should include media in feed posts', async () => {
      const mediaId = await uploadMedia(user.accessToken);

      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: {
          content: 'Feed post with image ' + Date.now(),
          mediaIds: [mediaId],
        },
      });

      const feedRes = await app.inject({
        method: 'GET',
        url: '/api/v1/feed',
        headers: authHeaders(user.accessToken),
      });

      expect(feedRes.statusCode).toBe(200);
      const feed = JSON.parse(feedRes.body);
      // Find the post with media
      const postWithMedia = feed.data.find(
        (p: { media?: unknown[] }) => p.media && p.media.length > 0
      );
      expect(postWithMedia).toBeDefined();
      expect(postWithMedia.media[0].url).toBeDefined();
      expect(postWithMedia.media[0].type).toBe('IMAGE');
    });
  });
});
