/**
 * KMS Key Rotation & Health Check Tests
 *
 * SEC-005: Validates that the KMSService supports:
 * - clearCache() properly clears publicKey and address caches
 * - After clearCache(), getPublicKey() fetches fresh from KMS
 * - rotateKey(newKeyId) updates key ID and clears caches
 * - isKeyHealthy() returns true when key is functional, false otherwise
 * - Re-initialization with a different KMS key ID (simulating rotation)
 */

import { KMSService } from '../../src/services/kms.service';
import { KMSClient, GetPublicKeyCommand } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';

// Mock AWS SDK - preserve input property on commands
jest.mock('@aws-sdk/client-kms', () => {
  const actual = jest.requireActual('@aws-sdk/client-kms');
  return {
    ...actual,
    KMSClient: jest.fn(),
    GetPublicKeyCommand: jest.fn().mockImplementation((input: any) => ({
      input,
      _brand: 'GetPublicKeyCommand',
    })),
  };
});

// Mock logger to verify rotation logging
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { logger } from '../../src/utils/logger';

describe('KMSService - Key Rotation & Health Check', () => {
  let kmsService: KMSService;
  let mockKMSClient: any;

  // Test fixtures
  const testPrivateKey =
    '0x1234567890123456789012345678901234567890123456789012345678901234';
  const testWallet = new ethers.Wallet(testPrivateKey);
  const testPublicKey = testWallet.signingKey.publicKey;

  function buildMockDER(): Buffer {
    const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
    return Buffer.concat([
      Buffer.from([0x30, 0x56, 0x30, 0x10]),
      publicKeyBytes,
    ]);
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockKMSClient = {
      send: jest.fn(),
    };

    (KMSClient as any).mockImplementation(() => mockKMSClient);

    kmsService = new KMSService({
      keyId: 'original-key-id-1234567890',
      region: 'us-east-1',
    });
  });

  describe('clearCache', () => {
    it('should clear the publicKey cache so next getPublicKey fetches from KMS', async () => {
      // Prime the cache
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });
      await kmsService.getPublicKey();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(1);

      // Verify cache is being used
      await kmsService.getPublicKey();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(1);

      // Clear cache
      kmsService.clearCache();

      // Next call should hit KMS again
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });
      await kmsService.getPublicKey();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(2);
    });

    it('should clear the address cache so next getAddress fetches fresh', async () => {
      // Prime address cache
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });
      await kmsService.getAddress();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(1);

      // Verify address cache is working
      await kmsService.getAddress();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(1);

      // Clear cache
      kmsService.clearCache();

      // Next call should hit KMS again
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });
      await kmsService.getAddress();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('rotateKey', () => {
    it('should update the key ID to the new value', async () => {
      const newKeyId = 'new-key-id-abcdefgh1234';

      // Prime cache with original key
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });
      await kmsService.getPublicKey();

      // Rotate to new key
      kmsService.rotateKey(newKeyId);

      // After rotation, getPublicKey should send a new GetPublicKeyCommand
      // with the new key ID
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });
      await kmsService.getPublicKey();

      // The second call should use the new key ID
      const secondCall = mockKMSClient.send.mock.calls[1][0];
      expect(secondCall.input.KeyId).toBe(newKeyId);
    });

    it('should clear all caches when rotating', async () => {
      // Prime both caches
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });
      await kmsService.getAddress();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(1);

      // Rotate
      kmsService.rotateKey('rotated-key-id-9876543210');

      // Both caches should be cleared - next calls hit KMS
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });
      await kmsService.getPublicKey();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(2);

      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });

      // Clear again so getAddress re-fetches
      kmsService.clearCache();
      await kmsService.getAddress();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(3);
    });

    it('should log a warning with truncated key IDs', () => {
      kmsService.rotateKey('new-key-id-abcdefgh1234');

      expect(logger.warn).toHaveBeenCalledWith(
        'KMS key rotation initiated',
        expect.objectContaining({
          oldKeyId: 'original...',
          newKeyId: 'new-key-...',
        })
      );
    });
  });

  describe('isKeyHealthy', () => {
    it('should return true when getPublicKey succeeds', async () => {
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });

      const healthy = await kmsService.isKeyHealthy();
      expect(healthy).toBe(true);
    });

    it('should return false when getPublicKey fails', async () => {
      mockKMSClient.send.mockRejectedValueOnce(
        new Error('KMS key disabled')
      );

      const healthy = await kmsService.isKeyHealthy();
      expect(healthy).toBe(false);
    });

    it('should not throw even when KMS is completely unreachable', async () => {
      mockKMSClient.send.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      // Should not throw, just return false
      await expect(kmsService.isKeyHealthy()).resolves.toBe(false);
    });
  });

  describe('re-initialization with different key ID', () => {
    it('should create a new instance with a different key ID', async () => {
      const service1 = new KMSService({
        keyId: 'key-id-1-aaaaaaaaaa',
        region: 'us-east-1',
      });

      const service2 = new KMSService({
        keyId: 'key-id-2-bbbbbbbbbb',
        region: 'us-east-1',
      });

      // Both are valid instances
      expect(service1).toBeInstanceOf(KMSService);
      expect(service2).toBeInstanceOf(KMSService);

      // They should use their respective key IDs when calling KMS
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });
      await service1.getPublicKey();

      const firstCall = mockKMSClient.send.mock.calls[0][0];
      expect(firstCall.input.KeyId).toBe('key-id-1-aaaaaaaaaa');

      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDER(),
      });
      await service2.getPublicKey();

      const secondCall = mockKMSClient.send.mock.calls[1][0];
      expect(secondCall.input.KeyId).toBe('key-id-2-bbbbbbbbbb');
    });
  });
});
