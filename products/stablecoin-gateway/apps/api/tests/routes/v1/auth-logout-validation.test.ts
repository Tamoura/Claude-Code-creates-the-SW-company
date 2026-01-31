import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/app.js';
import { randomUUID } from 'crypto';

describe('Logout endpoint body validation', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let jwtToken: string;

  beforeAll(async () => {
    app = await buildApp();

    const user = await app.prisma.user.create({
      data: {
        email: `logout-val-${Date.now()}@test.com`,
        passwordHash: 'not-a-real-hash',
      },
    });
    testUserId = user.id;

    jwtToken = app.jwt.sign({ userId: testUserId, jti: randomUUID() });
  });

  afterAll(async () => {
    await app.prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await app.prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  it('should return 400 when refresh_token is missing', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/v1/auth/logout',
      headers: { authorization: `Bearer ${jwtToken}` },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 when refresh_token is a number', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/v1/auth/logout',
      headers: {
        authorization: `Bearer ${jwtToken}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ refresh_token: 12345 }),
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 when refresh_token is empty string', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/v1/auth/logout',
      headers: { authorization: `Bearer ${jwtToken}` },
      payload: { refresh_token: '' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should accept valid refresh_token string', async () => {
    // A valid JWT-shaped string that won't match any stored token
    const fakeRefreshToken = app.jwt.sign(
      { userId: testUserId, type: 'refresh', jti: randomUUID() },
      { expiresIn: '7d' }
    );

    const response = await app.inject({
      method: 'DELETE',
      url: '/v1/auth/logout',
      headers: { authorization: `Bearer ${jwtToken}` },
      payload: { refresh_token: fakeRefreshToken },
    });

    // 404 = passed validation, token just not found in DB
    // This proves the validation layer accepted the body
    expect(response.statusCode).toBe(404);
  });
});
