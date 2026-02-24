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

// Helper: create a minimal valid PNG buffer (1x1 pixel)
function createPngBuffer(): Buffer {
  // Minimal valid PNG: 1x1 transparent pixel
  return Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000a49444154789c6260000000060005012769b400000000049454e44ae426082',
    'hex'
  );
}

// Helper: create a minimal valid JPEG buffer
function createJpegBuffer(): Buffer {
  // Minimal JPEG (SOI + EOI markers with minimal content)
  return Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc40000ffd9',
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

  // File part
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  ));
  parts.push(fileBuffer);
  parts.push(Buffer.from('\r\n'));

  // Extra fields
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

describe('Media Upload API', () => {
  describe('POST /api/v1/media/upload', () => {
    it('should upload an image and return media metadata', async () => {
      const png = createPngBuffer();
      const { body, contentType } = buildMultipartPayload(
        'file', 'test.png', 'image/png', png,
        { type: 'IMAGE' }
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/media/upload',
        headers: {
          ...authHeaders(user.accessToken),
          'content-type': contentType,
        },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
      expect(json.data.type).toBe('IMAGE');
      expect(json.data.status).toBe('READY');
      expect(json.data.url).toBeDefined();
      expect(json.data.mimeType).toBe('image/png');
      expect(json.data.originalName).toBe('test.png');
    });

    it('should upload a JPEG image', async () => {
      const jpeg = createJpegBuffer();
      const { body, contentType } = buildMultipartPayload(
        'file', 'photo.jpg', 'image/jpeg', jpeg,
        { type: 'IMAGE' }
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/media/upload',
        headers: {
          ...authHeaders(user.accessToken),
          'content-type': contentType,
        },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.data.mimeType).toBe('image/jpeg');
    });

    it('should accept altText for accessibility', async () => {
      const png = createPngBuffer();
      const { body, contentType } = buildMultipartPayload(
        'file', 'test.png', 'image/png', png,
        { type: 'IMAGE', altText: 'A test image' }
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/media/upload',
        headers: {
          ...authHeaders(user.accessToken),
          'content-type': contentType,
        },
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.data.altText).toBe('A test image');
    });

    it('should reject uploads without authentication', async () => {
      const png = createPngBuffer();
      const { body, contentType } = buildMultipartPayload(
        'file', 'test.png', 'image/png', png,
        { type: 'IMAGE' }
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/media/upload',
        headers: { 'content-type': contentType },
        payload: body,
      });

      expect(res.statusCode).toBe(401);
    });

    it('should reject files exceeding size limit', async () => {
      // Create a buffer > 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 0xff);
      // Prepend PNG magic bytes
      const png = createPngBuffer();
      const combined = Buffer.concat([png, largeBuffer]);

      const { body, contentType } = buildMultipartPayload(
        'file', 'huge.png', 'image/png', combined,
        { type: 'IMAGE' }
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/media/upload',
        headers: {
          ...authHeaders(user.accessToken),
          'content-type': contentType,
        },
        payload: body,
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/media/:id', () => {
    it('should return media metadata by ID', async () => {
      // First upload
      const png = createPngBuffer();
      const { body, contentType } = buildMultipartPayload(
        'file', 'get-test.png', 'image/png', png,
        { type: 'IMAGE' }
      );

      const uploadRes = await app.inject({
        method: 'POST',
        url: '/api/v1/media/upload',
        headers: {
          ...authHeaders(user.accessToken),
          'content-type': contentType,
        },
        payload: body,
      });

      const mediaId = JSON.parse(uploadRes.body).data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/media/${mediaId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.id).toBe(mediaId);
      expect(json.data.originalName).toBe('get-test.png');
    });

    it('should return 404 for non-existent media', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/media/00000000-0000-0000-0000-000000000000',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/media/:id', () => {
    it('should delete own media', async () => {
      // Upload first
      const png = createPngBuffer();
      const { body, contentType } = buildMultipartPayload(
        'file', 'delete-test.png', 'image/png', png,
        { type: 'IMAGE' }
      );

      const uploadRes = await app.inject({
        method: 'POST',
        url: '/api/v1/media/upload',
        headers: {
          ...authHeaders(user.accessToken),
          'content-type': contentType,
        },
        payload: body,
      });

      const mediaId = JSON.parse(uploadRes.body).data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/media/${mediaId}`,
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.deleted).toBe(true);

      // Verify it's gone
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/media/${mediaId}`,
        headers: authHeaders(user.accessToken),
      });
      expect(getRes.statusCode).toBe(404);
    });

    it('should not allow deleting another user\'s media', async () => {
      // Upload as user
      const png = createPngBuffer();
      const { body, contentType } = buildMultipartPayload(
        'file', 'other.png', 'image/png', png,
        { type: 'IMAGE' }
      );

      const uploadRes = await app.inject({
        method: 'POST',
        url: '/api/v1/media/upload',
        headers: {
          ...authHeaders(user.accessToken),
          'content-type': contentType,
        },
        payload: body,
      });

      const mediaId = JSON.parse(uploadRes.body).data.id;

      // Try to delete as another user
      const otherUser = await createTestUser(app);
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/media/${mediaId}`,
        headers: authHeaders(otherUser.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
