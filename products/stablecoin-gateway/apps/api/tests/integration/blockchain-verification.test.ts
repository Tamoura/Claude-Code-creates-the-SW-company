import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

describe('Blockchain Verification Integration', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await buildApp();
    prisma = app.prisma;

    // Create test user
    const hashedPassword = await bcrypt.hash('Test123!@#', 10);
    const user = await prisma.user.create({
      data: {
        email: 'blockchain-test@example.com',
        passwordHash: hashedPassword,
      },
    });
    userId = user.id;

    // Login to get token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'blockchain-test@example.com',
        password: 'Test123!@#',
      },
    });

    authToken = loginResponse.json().access_token;
  });

  afterAll(async () => {
    await prisma.paymentSession.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  describe('PATCH /v1/payment-sessions/:id with blockchain verification', () => {
    it('should reject transaction update with fake tx hash', async () => {
      // Create payment session
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
          network: 'polygon',
          token: 'USDC',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const paymentSession = createResponse.json();

      // Try to update with fake tx hash
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentSession.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          status: 'CONFIRMING',
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const error = updateResponse.json();
      // The error response format is { type, title, status, detail }
      expect(error.type).toContain('invalid-transaction');
      expect(error.detail).toContain('not found');
    });

    it('should accept valid transaction update without verification when no status change to CONFIRMING/COMPLETED', async () => {
      // Create payment session
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
          network: 'polygon',
          token: 'USDC',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const paymentSession = createResponse.json();

      // Update customer address (no verification needed)
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentSession.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          customer_address: '0x9999999999999999999999999999999999999999',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const updated = updateResponse.json();
      expect(updated.customer_address).toBe('0x9999999999999999999999999999999999999999');
    });

    it('should require tx_hash when updating status to CONFIRMING', async () => {
      // Create payment session
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
          network: 'polygon',
          token: 'USDC',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const paymentSession = createResponse.json();

      // Try to update status without tx_hash
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentSession.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          status: 'CONFIRMING',
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const error = updateResponse.json();
      expect(error.type).toContain('missing-tx-hash');
    });

    it('should accept mocked valid transaction with correct verification', async () => {
      // Create payment session
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
          network: 'polygon',
          token: 'USDC',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const paymentSession = createResponse.json();

      // Mock the blockchain service to return valid verification
      const mockVerificationResult = {
        valid: true,
        confirmations: 15,
        blockNumber: 12345,
        sender: '0x8888888888888888888888888888888888888888',
      };

      // Inject mock into the blockchain service
      const BlockchainMonitorService = require('../../src/services/blockchain-monitor.service').BlockchainMonitorService;
      const originalVerify = BlockchainMonitorService.prototype.verifyPaymentTransaction;

      BlockchainMonitorService.prototype.verifyPaymentTransaction = jest.fn().mockResolvedValue(mockVerificationResult);

      // Update with verified transaction
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentSession.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          status: 'CONFIRMING',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const updated = updateResponse.json();
      expect(updated.status).toBe('CONFIRMING');
      expect(updated.tx_hash).toBe('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
      expect(updated.block_number).toBe(12345);
      expect(updated.confirmations).toBe(15);
      expect(updated.customer_address).toBe('0x8888888888888888888888888888888888888888');

      // Restore original method
      BlockchainMonitorService.prototype.verifyPaymentTransaction = originalVerify;
    });

    it('should reject transaction with wrong amount detected on-chain', async () => {
      // Create payment session for 100 USDC
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
          network: 'polygon',
          token: 'USDC',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const paymentSession = createResponse.json();

      // Mock blockchain verification to return wrong amount
      const mockVerificationResult = {
        valid: false,
        confirmations: 15,
        blockNumber: 12345,
        sender: '0x8888888888888888888888888888888888888888',
        error: 'Amount mismatch (expected 100, got 50)',
      };

      const BlockchainMonitorService = require('../../src/services/blockchain-monitor.service').BlockchainMonitorService;
      const originalVerify = BlockchainMonitorService.prototype.verifyPaymentTransaction;

      BlockchainMonitorService.prototype.verifyPaymentTransaction = jest.fn().mockResolvedValue(mockVerificationResult);

      // Try to update with transaction that has wrong amount
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentSession.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          status: 'CONFIRMING',
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const error = updateResponse.json();
      expect(error.type).toContain('invalid-transaction');
      expect(error.detail).toContain('Amount mismatch');

      // Restore original method
      BlockchainMonitorService.prototype.verifyPaymentTransaction = originalVerify;
    });
  });
});
