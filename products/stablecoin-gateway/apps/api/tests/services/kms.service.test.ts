import { KMSService, createKMSService } from '../../src/services/kms.service';
import { KMSClient, GetPublicKeyCommand } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';

// Mock AWS SDK
jest.mock('@aws-sdk/client-kms');

describe('KMSService', () => {
  let kmsService: KMSService;
  let mockKMSClient: any;

  // Test fixtures - Valid SECP256K1 key pair
  // Private key: Used only for generating test signatures
  const testPrivateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
  const testWallet = new ethers.Wallet(testPrivateKey);

  // Uncompressed public key (65 bytes with 04 prefix)
  const testPublicKey = testWallet.signingKey.publicKey; // 0x04... format
  const testAddress = testWallet.address;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock KMSClient
    mockKMSClient = {
      send: jest.fn(),
    };

    (KMSClient as any).mockImplementation(() => mockKMSClient);

    kmsService = new KMSService({
      keyId: 'test-key-id',
      region: 'us-east-1',
    });
  });

  describe('constructor', () => {
    it('should throw error if keyId is not provided', () => {
      expect(() => {
        new KMSService({ keyId: '' });
      }).toThrow('KMS Key ID is required');
    });

    it('should create instance with valid config', () => {
      const service = new KMSService({
        keyId: 'test-key',
        region: 'us-west-2',
        maxRetries: 5,
        timeout: 60000,
      });

      expect(service).toBeInstanceOf(KMSService);
    });

    it('should use default region if not provided', () => {
      const originalRegion = process.env.AWS_REGION;
      process.env.AWS_REGION = 'eu-west-1';

      new KMSService({ keyId: 'test-key' });

      expect(KMSClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'eu-west-1',
        })
      );

      process.env.AWS_REGION = originalRegion;
    });
  });

  describe('getPublicKey', () => {
    it('should retrieve and cache public key from KMS', async () => {
      // Create DER-encoded public key (simplified)
      const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
      const mockDER = Buffer.concat([
        Buffer.from([0x30, 0x56, 0x30, 0x10]), // DER header (simplified)
        publicKeyBytes,
      ]);

      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: mockDER,
      });

      const publicKey = await kmsService.getPublicKey();

      expect(publicKey).toBe(testPublicKey);
      expect(mockKMSClient.send).toHaveBeenCalledTimes(1);
      expect(mockKMSClient.send).toHaveBeenCalledWith(
        expect.any(GetPublicKeyCommand)
      );

      // Second call should use cache
      const publicKey2 = await kmsService.getPublicKey();
      expect(publicKey2).toBe(testPublicKey);
      expect(mockKMSClient.send).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should throw error if KMS returns no public key', async () => {
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: undefined,
      });

      await expect(kmsService.getPublicKey()).rejects.toThrow(
        'Failed to retrieve public key from KMS'
      );
    });

    it('should throw error if public key format is invalid', async () => {
      // Invalid public key (not 65 bytes or wrong prefix)
      const invalidKey = Buffer.from('invalid', 'hex');

      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: invalidKey,
      });

      await expect(kmsService.getPublicKey()).rejects.toThrow(
        'Failed to retrieve public key from KMS'
      );
    });
  });

  describe('getAddress', () => {
    it('should derive Ethereum address from public key', async () => {
      const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
      const mockDER = Buffer.concat([
        Buffer.from([0x30, 0x56, 0x30, 0x10]),
        publicKeyBytes,
      ]);

      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: mockDER,
      });

      const address = await kmsService.getAddress();

      expect(address).toBe(testAddress);
      expect(ethers.isAddress(address)).toBe(true);
    });

    it('should cache derived address', async () => {
      const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
      const mockDER = Buffer.concat([
        Buffer.from([0x30, 0x56, 0x30, 0x10]),
        publicKeyBytes,
      ]);

      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: mockDER,
      });

      const address1 = await kmsService.getAddress();
      const address2 = await kmsService.getAddress();

      expect(address1).toBe(address2);
      expect(mockKMSClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('sign', () => {
    it('should sign message hash and return valid signature', async () => {
      // Setup: Get public key first
      const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
      const mockDER = Buffer.concat([
        Buffer.from([0x30, 0x56, 0x30, 0x10]),
        publicKeyBytes,
      ]);

      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: mockDER,
      });

      // Create a test message and sign it with the test wallet
      const messageHash = ethers.id('test message');
      const expectedSig = testWallet.signingKey.sign(messageHash);

      // Mock KMS Sign response with DER-encoded signature
      const rBuf = Buffer.from(expectedSig.r.slice(2), 'hex');
      const sBuf = Buffer.from(expectedSig.s.slice(2), 'hex');

      // Create DER-encoded ECDSA signature
      const derSig = Buffer.concat([
        Buffer.from([0x30]), // SEQUENCE
        Buffer.from([4 + rBuf.length + sBuf.length]), // Length
        Buffer.from([0x02, rBuf.length]), // INTEGER r
        rBuf,
        Buffer.from([0x02, sBuf.length]), // INTEGER s
        sBuf,
      ]);

      mockKMSClient.send.mockResolvedValueOnce({
        Signature: derSig,
      });

      const signature = await kmsService.sign(messageHash);

      expect(signature).toBeDefined();
      expect(signature.r).toBeDefined();
      expect(signature.s).toBeDefined();
      expect(signature.v).toBeGreaterThanOrEqual(27);
      expect(signature.v).toBeLessThanOrEqual(28);

      // Verify signature recovers to correct address
      const recoveredAddress = ethers.recoverAddress(messageHash, signature);
      expect(recoveredAddress.toLowerCase()).toBe(testAddress.toLowerCase());
    });

    it('should throw error for invalid message hash format', async () => {
      await expect(kmsService.sign('invalid')).rejects.toThrow(
        'Message hash must be a 32-byte hex string with 0x prefix'
      );

      await expect(kmsService.sign('0x1234')).rejects.toThrow(
        'Message hash must be a 32-byte hex string with 0x prefix'
      );
    });

    it('should throw error if KMS returns no signature', async () => {
      const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
      const mockDER = Buffer.concat([
        Buffer.from([0x30, 0x56, 0x30, 0x10]),
        publicKeyBytes,
      ]);

      mockKMSClient.send
        .mockResolvedValueOnce({ PublicKey: mockDER })
        .mockResolvedValueOnce({ Signature: undefined });

      const messageHash = ethers.id('test');

      await expect(kmsService.sign(messageHash)).rejects.toThrow(
        'Failed to sign message with KMS'
      );
    });

    it('should normalize s value to lower half of curve order (EIP-2)', async () => {
      const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
      const mockDER = Buffer.concat([
        Buffer.from([0x30, 0x56, 0x30, 0x10]),
        publicKeyBytes,
      ]);

      // Create signature with high s value
      const secp256k1N = BigInt(
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'
      );
      const r = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      const sHigh = secp256k1N - BigInt(1); // Very high s value

      const rBuf = Buffer.from(r.toString(16).padStart(64, '0'), 'hex');
      const sBuf = Buffer.from(sHigh.toString(16).padStart(64, '0'), 'hex');

      const derSig = Buffer.concat([
        Buffer.from([0x30, 4 + rBuf.length + sBuf.length, 0x02, rBuf.length]),
        rBuf,
        Buffer.from([0x02, sBuf.length]),
        sBuf,
      ]);

      mockKMSClient.send
        .mockResolvedValueOnce({ PublicKey: mockDER })
        .mockResolvedValueOnce({ Signature: derSig });

      const messageHash = ethers.id('test');
      const signature = await kmsService.sign(messageHash);

      // s should be normalized to lower half
      const sValue = BigInt(signature.s);
      const secp256k1HalfN = secp256k1N / BigInt(2);
      expect(sValue).toBeLessThanOrEqual(secp256k1HalfN);
    });
  });

  describe('signTransaction', () => {
    it('should sign EIP-1559 transaction', async () => {
      const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
      const mockDER = Buffer.concat([
        Buffer.from([0x30, 0x56, 0x30, 0x10]),
        publicKeyBytes,
      ]);

      // Use a valid random address
      const toAddress = ethers.Wallet.createRandom().address;

      const transaction = {
        to: toAddress,
        value: ethers.parseEther('0.1'),
        gasLimit: 21000,
        maxFeePerGas: ethers.parseUnits('50', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
        nonce: 0,
        chainId: 137,
        type: 2,
      };

      // Mock GetPublicKey
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: mockDER,
      });

      // Sign the transaction with test wallet to get expected signature
      const unsignedTx = ethers.Transaction.from(transaction);
      const txHash = ethers.keccak256(unsignedTx.unsignedSerialized);
      const expectedSig = testWallet.signingKey.sign(txHash);

      const rBuf = Buffer.from(expectedSig.r.slice(2), 'hex');
      const sBuf = Buffer.from(expectedSig.s.slice(2), 'hex');
      const derSig = Buffer.concat([
        Buffer.from([0x30, 4 + rBuf.length + sBuf.length, 0x02, rBuf.length]),
        rBuf,
        Buffer.from([0x02, sBuf.length]),
        sBuf,
      ]);

      // Mock Sign
      mockKMSClient.send.mockResolvedValueOnce({
        Signature: derSig,
      });

      const signedTxHex = await kmsService.signTransaction(transaction);

      expect(signedTxHex).toMatch(/^0x/);
      expect(signedTxHex.length).toBeGreaterThan(100);

      // Verify signed transaction
      const signedTx = ethers.Transaction.from(signedTxHex);
      expect(signedTx.to).toBe(transaction.to);
      expect(signedTx.value).toBe(transaction.value);
      expect(signedTx.signature).toBeDefined();
    });

    it('should throw error if transaction has no "to" address', async () => {
      const transaction = {
        value: ethers.parseEther('0.1'),
      };

      await expect(kmsService.signTransaction(transaction)).rejects.toThrow(
        'Failed to sign transaction with KMS'
      );
    });

    it('should use default values for missing transaction fields', async () => {
      const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
      const mockDER = Buffer.concat([
        Buffer.from([0x30, 0x56, 0x30, 0x10]),
        publicKeyBytes,
      ]);

      const toAddress = ethers.Wallet.createRandom().address;

      const minimalTx = {
        to: toAddress,
      };

      // Mock GetPublicKey for signTransaction
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: mockDER,
      });

      const unsignedTx = ethers.Transaction.from({
        to: toAddress,
        value: 0,
        gasLimit: 21000,
        chainId: 137,
        type: 2,
      });
      const txHash = ethers.keccak256(unsignedTx.unsignedSerialized);
      const expectedSig = testWallet.signingKey.sign(txHash);

      const rBuf = Buffer.from(expectedSig.r.slice(2), 'hex');
      const sBuf = Buffer.from(expectedSig.s.slice(2), 'hex');
      const derSig = Buffer.concat([
        Buffer.from([0x30, 4 + rBuf.length + sBuf.length, 0x02, rBuf.length]),
        rBuf,
        Buffer.from([0x02, sBuf.length]),
        sBuf,
      ]);

      // Mock Sign
      mockKMSClient.send.mockResolvedValueOnce({
        Signature: derSig,
      });

      // Mock GetPublicKey again for recovery param calculation
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: mockDER,
      });

      const signedTxHex = await kmsService.signTransaction(minimalTx);
      expect(signedTxHex).toBeDefined();
      expect(signedTxHex).toMatch(/^0x/);
    });
  });

  describe('clearCache', () => {
    it('should clear cached public key and address', async () => {
      const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
      const mockDER = Buffer.concat([
        Buffer.from([0x30, 0x56, 0x30, 0x10]),
        publicKeyBytes,
      ]);

      mockKMSClient.send.mockResolvedValue({
        PublicKey: mockDER,
      });

      // Get public key (caches it)
      await kmsService.getPublicKey();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(1);

      // Get again (uses cache)
      await kmsService.getPublicKey();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(1);

      // Clear cache
      kmsService.clearCache();

      // Get again (fetches from KMS)
      await kmsService.getPublicKey();
      expect(mockKMSClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when KMS is accessible', async () => {
      const publicKeyBytes = Buffer.from(testPublicKey.slice(2), 'hex');
      const mockDER = Buffer.concat([
        Buffer.from([0x30, 0x56, 0x30, 0x10]),
        publicKeyBytes,
      ]);

      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: mockDER,
      });

      const result = await kmsService.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.message).toBe('KMS connection successful');
    });

    it('should return unhealthy status when KMS is not accessible', async () => {
      mockKMSClient.send.mockRejectedValueOnce(new Error('Access denied'));

      const result = await kmsService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('retrieve public key');
    });
  });

  describe('createKMSService', () => {
    it('should create KMS service from environment variables', () => {
      process.env.KMS_KEY_ID = 'env-key-id';
      process.env.AWS_REGION = 'us-west-2';

      const service = createKMSService();

      expect(service).toBeInstanceOf(KMSService);
      expect(KMSClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-west-2',
        })
      );

      delete process.env.KMS_KEY_ID;
      delete process.env.AWS_REGION;
    });

    it('should support AWS_KMS_KEY_ID as alternative env var', () => {
      process.env.AWS_KMS_KEY_ID = 'alt-key-id';

      const service = createKMSService();

      expect(service).toBeInstanceOf(KMSService);

      delete process.env.AWS_KMS_KEY_ID;
    });

    it('should throw error if no key ID in environment', () => {
      delete process.env.KMS_KEY_ID;
      delete process.env.AWS_KMS_KEY_ID;

      expect(() => createKMSService()).toThrow(
        'KMS_KEY_ID environment variable is required'
      );
    });
  });
});
