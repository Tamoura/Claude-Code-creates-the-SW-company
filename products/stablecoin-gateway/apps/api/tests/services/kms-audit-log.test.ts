/**
 * KMS Audit Log Tests
 *
 * AC-KMS-02-03: Application signing log includes timestamp, keyId prefix
 * (first 8 chars), operation type, network, and outcome (success/error-code).
 * No signature bytes (r, s, v) are logged.
 *
 * Tests KMSService.signTransaction() and KMSService.sign() success-path
 * structured audit log entries.
 */

import { KMSService } from '../../src/services/kms.service';
import { KMSClient } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';

// Mock AWS SDK
jest.mock('@aws-sdk/client-kms');

// Mock logger to capture log output
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { logger } from '../../src/utils/logger';

describe('KMSService - Structured Audit Log (AC-KMS-02-03)', () => {
  let kmsService: KMSService;
  let mockKMSClient: any;

  // Test fixtures — valid secp256k1 key pair
  const testPrivateKey =
    '0x1234567890123456789012345678901234567890123456789012345678901234';
  const testWallet = new ethers.Wallet(testPrivateKey);
  const testPublicKey = testWallet.signingKey.publicKey;
  const testAddress = testWallet.address;
  const TEST_KEY_ID = 'abcdefgh-1234-5678-90ab-cdefghijklmn';

  function buildMockDER(): Buffer {
    const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
    return Buffer.concat([
      Buffer.from([0x30, 0x56, 0x30, 0x10]),
      publicKeyBytes,
    ]);
  }

  function buildDERSignature(rHex: string, sHex: string): Buffer {
    const rBuf = Buffer.from(rHex, 'hex');
    const sBuf = Buffer.from(sHex, 'hex');
    return Buffer.concat([
      Buffer.from([0x30, 4 + rBuf.length + sBuf.length, 0x02, rBuf.length]),
      rBuf,
      Buffer.from([0x02, sBuf.length]),
      sBuf,
    ]);
  }

  async function primePublicKeyCache() {
    mockKMSClient.send.mockResolvedValueOnce({ PublicKey: buildMockDER() });
    await kmsService.getPublicKey();
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockKMSClient = { send: jest.fn() };
    (KMSClient as any).mockImplementation(() => mockKMSClient);

    kmsService = new KMSService({
      keyId: TEST_KEY_ID,
      region: 'us-east-1',
    });
  });

  describe('signTransaction() audit log', () => {
    it('[US-KMS-02][AC-3] emits structured info log on successful signTransaction', async () => {
      await primePublicKeyCache();

      const toAddress = ethers.Wallet.createRandom().address;
      const tx = {
        to: toAddress,
        value: 0,
        gasLimit: 21000,
        chainId: 137,
        type: 2,
        nonce: 0,
      };

      const unsignedTx = ethers.Transaction.from(tx);
      const txHash = ethers.keccak256(unsignedTx.unsignedSerialized);
      const expectedSig = testWallet.signingKey.sign(txHash);
      const derSig = buildDERSignature(
        expectedSig.r.slice(2),
        expectedSig.s.slice(2)
      );
      mockKMSClient.send.mockResolvedValueOnce({ Signature: derSig });

      await kmsService.signTransaction(tx);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('signing'),
        expect.objectContaining({
          keyId: TEST_KEY_ID.substring(0, 8) + '...',
          operation: 'transaction-signing',
          outcome: 'success',
        })
      );
    });

    it('[US-KMS-02][AC-3] audit log keyId is truncated to first 8 chars + ellipsis', async () => {
      await primePublicKeyCache();

      const toAddress = ethers.Wallet.createRandom().address;
      const tx = { to: toAddress, chainId: 137, type: 2, nonce: 0 };

      const unsignedTx = ethers.Transaction.from({
        ...tx,
        value: 0,
        gasLimit: 21000,
      });
      const txHash = ethers.keccak256(unsignedTx.unsignedSerialized);
      const expectedSig = testWallet.signingKey.sign(txHash);
      const derSig = buildDERSignature(
        expectedSig.r.slice(2),
        expectedSig.s.slice(2)
      );
      mockKMSClient.send.mockResolvedValueOnce({ Signature: derSig });

      await kmsService.signTransaction(tx);

      const infoCalls = (logger.info as jest.Mock).mock.calls;
      const auditCall = infoCalls.find(
        (call) =>
          call[1] &&
          typeof call[1] === 'object' &&
          call[1].operation === 'transaction-signing'
      );
      expect(auditCall).toBeDefined();
      const loggedKeyId = auditCall[1].keyId as string;

      // Must be exactly 8 chars + '...' (11 chars total)
      expect(loggedKeyId).toBe('abcdefgh...');
      expect(loggedKeyId).not.toContain(TEST_KEY_ID);
    });

    it('[US-KMS-02][AC-3] audit log does NOT contain signature bytes (r, s, v)', async () => {
      await primePublicKeyCache();

      const toAddress = ethers.Wallet.createRandom().address;
      const tx = { to: toAddress, chainId: 137, type: 2, nonce: 0 };

      const unsignedTx = ethers.Transaction.from({
        ...tx,
        value: 0,
        gasLimit: 21000,
      });
      const txHash = ethers.keccak256(unsignedTx.unsignedSerialized);
      const expectedSig = testWallet.signingKey.sign(txHash);
      const derSig = buildDERSignature(
        expectedSig.r.slice(2),
        expectedSig.s.slice(2)
      );
      mockKMSClient.send.mockResolvedValueOnce({ Signature: derSig });

      await kmsService.signTransaction(tx);

      const allLogCalls = [
        ...(logger.info as jest.Mock).mock.calls,
        ...(logger.warn as jest.Mock).mock.calls,
        ...(logger.debug as jest.Mock).mock.calls,
      ];
      const auditCall = allLogCalls.find(
        (call) =>
          call[1] &&
          typeof call[1] === 'object' &&
          call[1].operation === 'transaction-signing'
      );
      expect(auditCall).toBeDefined();
      const logObj = auditCall[1];

      // Signature bytes must not be present
      expect(logObj).not.toHaveProperty('r');
      expect(logObj).not.toHaveProperty('s');
      expect(logObj).not.toHaveProperty('v');
      expect(logObj).not.toHaveProperty('signature');

      // Full key ARN must not be present
      const logStr = JSON.stringify(logObj);
      expect(logStr).not.toContain(TEST_KEY_ID);
    });
  });

  describe('sign() audit log', () => {
    it('[US-KMS-02][AC-3] emits structured info log on successful sign()', async () => {
      await primePublicKeyCache();

      const messageHash = ethers.id('test message');
      const expectedSig = testWallet.signingKey.sign(messageHash);
      const derSig = buildDERSignature(
        expectedSig.r.slice(2),
        expectedSig.s.slice(2)
      );
      mockKMSClient.send.mockResolvedValueOnce({ Signature: derSig });

      await kmsService.sign(messageHash);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('signing'),
        expect.objectContaining({
          keyId: TEST_KEY_ID.substring(0, 8) + '...',
          operation: 'message-signing',
          outcome: 'success',
        })
      );
    });

    it('[US-KMS-02][AC-3] sign() audit log does NOT contain signature bytes', async () => {
      await primePublicKeyCache();

      const messageHash = ethers.id('test message');
      const expectedSig = testWallet.signingKey.sign(messageHash);
      const derSig = buildDERSignature(
        expectedSig.r.slice(2),
        expectedSig.s.slice(2)
      );
      mockKMSClient.send.mockResolvedValueOnce({ Signature: derSig });

      await kmsService.sign(messageHash);

      const infoCalls = (logger.info as jest.Mock).mock.calls;
      const auditCall = infoCalls.find(
        (call) =>
          call[1] &&
          typeof call[1] === 'object' &&
          call[1].operation === 'message-signing'
      );
      expect(auditCall).toBeDefined();
      const logObj = auditCall[1];

      expect(logObj).not.toHaveProperty('r');
      expect(logObj).not.toHaveProperty('s');
      expect(logObj).not.toHaveProperty('v');
      expect(logObj).not.toHaveProperty('signature');
      expect(JSON.stringify(logObj)).not.toContain(TEST_KEY_ID);
    });
  });
});
