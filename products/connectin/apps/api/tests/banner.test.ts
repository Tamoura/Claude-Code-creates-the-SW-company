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
  fileBuffer: Buffer
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
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describe('Profile Banner API', () => {
  describe('PUT /api/v1/profiles/me/banner', () => {
    it('should upload a banner image', async () => {
      const png = createPngBuffer();
      const { body, contentType } = buildMultipartPayload(
        'file', 'banner.png', 'image/png', png
      );

      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/banner',
        headers: {
          ...authHeaders(user.accessToken),
          'content-type': contentType,
        },
        payload: body,
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.data.bannerUrl).toBeDefined();
      expect(typeof json.data.bannerUrl).toBe('string');
    });

    it('should return banner in profile response', async () => {
      // Upload banner first
      const png = createPngBuffer();
      const { body, contentType } = buildMultipartPayload(
        'file', 'banner2.png', 'image/png', png
      );

      await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/banner',
        headers: {
          ...authHeaders(user.accessToken),
          'content-type': contentType,
        },
        payload: body,
      });

      // Check profile
      const profileRes = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user.accessToken),
      });

      expect(profileRes.statusCode).toBe(200);
      const profile = JSON.parse(profileRes.body);
      expect(profile.data.bannerUrl).toBeDefined();
      expect(profile.data.bannerUrl).toBeTruthy();
    });

    it('should reject non-image files for banner', async () => {
      const fakeFile = Buffer.from('not an image at all');
      const { body, contentType } = buildMultipartPayload(
        'file', 'document.pdf', 'application/pdf', fakeFile
      );

      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/banner',
        headers: {
          ...authHeaders(user.accessToken),
          'content-type': contentType,
        },
        payload: body,
      });

      expect(res.statusCode).toBe(422);
    });

    it('should require authentication', async () => {
      const png = createPngBuffer();
      const { body, contentType } = buildMultipartPayload(
        'file', 'banner.png', 'image/png', png
      );

      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/banner',
        headers: { 'content-type': contentType },
        payload: body,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/profiles/me/banner', () => {
    it('should remove the banner image', async () => {
      // Upload first
      const png = createPngBuffer();
      const { body, contentType } = buildMultipartPayload(
        'file', 'to-delete.png', 'image/png', png
      );

      await app.inject({
        method: 'PUT',
        url: '/api/v1/profiles/me/banner',
        headers: {
          ...authHeaders(user.accessToken),
          'content-type': contentType,
        },
        payload: body,
      });

      // Delete
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/profiles/me/banner',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.bannerUrl).toBeNull();

      // Verify profile no longer has banner
      const profileRes = await app.inject({
        method: 'GET',
        url: '/api/v1/profiles/me',
        headers: authHeaders(user.accessToken),
      });

      const profile = JSON.parse(profileRes.body);
      expect(profile.data.bannerUrl).toBeNull();
    });

    it('should be idempotent when no banner exists', async () => {
      // Clean state - create fresh user with no banner
      const freshUser = await createTestUser(app);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/profiles/me/banner',
        headers: authHeaders(freshUser.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.data.bannerUrl).toBeNull();
    });
  });
});
