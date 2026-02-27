/**
 * KMS Admin Rotation Endpoint Tests
 *
 * US-KMS-03: POST /v1/admin/kms/rotate
 * Tests the HTTP endpoint that exposes KMSService.rotateKey() to DevOps.
 *
 * Tests:
 * - 401 without auth
 * - 403 for non-admin roles
 * - 200 with valid admin auth + newKeyId, calls rotateKey()
 * - 503 when health check on new key fails
 * - 400 when newKeyId is missing from request body
 * - Response keyId is truncated to first 8 chars + '...'
 */

import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../setup';
import bcrypt from 'bcrypt';

// We mock kms.service at the module level so the admin route picks up
// a controllable KMSService instance when it calls rotateKey / healthCheck
const mockRotateKey = jest.fn();
const mockHealthCheck = jest.fn();

jest.mock('../../src/services/kms.service', () => ({
  KMSService: jest.fn().mockImplementation(() => ({
    getAddress: jest.fn().mockResolvedValue('0xKMSAddress'),
    signTransaction: jest.fn().mockResolvedValue('0xSignedTx'),
    sign: jest.fn().mockResolvedValue({}),
    healthCheck: mockHealthCheck,
    rotateKey: mockRotateKey,
    getCurrentKeyId: jest.fn().mockReturnValue('old-key-id'),
    clearCache: jest.fn(),
    isKeyHealthy: jest.fn().mockResolvedValue(true),
  })),
  createKMSService: jest.fn().mockImplementation(() => ({
    getAddress: jest.fn().mockResolvedValue('0xKMSAddress'),
    signTransaction: jest.fn().mockResolvedValue('0xSignedTx'),
    sign: jest.fn().mockResolvedValue({}),
    healthCheck: mockHealthCheck,
    rotateKey: mockRotateKey,
    getCurrentKeyId: jest.fn().mockReturnValue('old-key-id'),
    clearCache: jest.fn(),
    isKeyHealthy: jest.fn().mockResolvedValue(true),
  })),
}));

describe('POST /v1/admin/kms/rotate (GAP-04)', () => {
  let app: FastifyInstance;
  const testUA = `KmsAdminRotationTest/${Date.now()}`;
  let adminToken: string;
  let merchantToken: string;

  const NEW_KEY_ID = 'new-key-abcdefghijklmnop';

  beforeAll(async () => {
    app = await buildApp();
    const passwordHash = await bcrypt.hash('Test123!@#', 10);

    // Admin user
    await prisma.user.upsert({
      where: { email: 'admin-kms-rotation@test.com' },
      update: { role: 'ADMIN' },
      create: {
        email: 'admin-kms-rotation@test.com',
        passwordHash,
        role: 'ADMIN',
      },
    });

    // Merchant user (non-admin)
    await prisma.user.upsert({
      where: { email: 'merchant-kms-rotation@test.com' },
      update: {},
      create: {
        email: 'merchant-kms-rotation@test.com',
        passwordHash,
        role: 'MERCHANT',
      },
    });

    // Login as admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'admin-kms-rotation@test.com', password: 'Test123!@#' },
      headers: { 'user-agent': `${testUA}-admin` },
    });
    adminToken = adminLogin.json().access_token;

    // Login as merchant
    const merchantLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'merchant-kms-rotation@test.com', password: 'Test123!@#' },
      headers: { 'user-agent': `${testUA}-merchant` },
    });
    merchantToken = merchantLogin.json().access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockHealthCheck.mockResolvedValue({ status: 'healthy', message: 'KMS connection successful' });
    mockRotateKey.mockReturnValue(undefined);
  });

  it('[US-KMS-03][AC-1] returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/kms/rotate',
      payload: { newKeyId: NEW_KEY_ID },
      headers: { 'user-agent': testUA },
    });
    expect(res.statusCode).toBe(401);
  });

  it('[US-KMS-03][AC-1] returns 403 for non-admin (MERCHANT) role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/kms/rotate',
      payload: { newKeyId: NEW_KEY_ID },
      headers: {
        authorization: `Bearer ${merchantToken}`,
        'user-agent': testUA,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('[US-KMS-03][AC-1] returns 200 with success and calls rotateKey() with admin auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/kms/rotate',
      payload: { newKeyId: NEW_KEY_ID },
      headers: {
        authorization: `Bearer ${adminToken}`,
        'user-agent': testUA,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBeDefined();
    expect(mockRotateKey).toHaveBeenCalledWith(NEW_KEY_ID);
  });

  it('[US-KMS-03][AC-1] response contains truncated keyId (first 8 chars + ...)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/kms/rotate',
      payload: { newKeyId: NEW_KEY_ID },
      headers: {
        authorization: `Bearer ${adminToken}`,
        'user-agent': testUA,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.keyId).toBe(NEW_KEY_ID.substring(0, 8) + '...');
  });

  it('[US-KMS-03][AC-1] returns 503 when health check on new key fails', async () => {
    mockHealthCheck.mockResolvedValue({
      status: 'unhealthy',
      message: 'KMS key not accessible',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/kms/rotate',
      payload: { newKeyId: NEW_KEY_ID },
      headers: {
        authorization: `Bearer ${adminToken}`,
        'user-agent': testUA,
      },
    });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.error).toBeDefined();
  });

  it('[US-KMS-03][AC-1] returns 400 when newKeyId is missing from body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/kms/rotate',
      payload: {},
      headers: {
        authorization: `Bearer ${adminToken}`,
        'user-agent': testUA,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('[US-KMS-03][AC-1] returns 400 when newKeyId is empty string', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/kms/rotate',
      payload: { newKeyId: '' },
      headers: {
        authorization: `Bearer ${adminToken}`,
        'user-agent': testUA,
      },
    });
    expect(res.statusCode).toBe(400);
  });
});
