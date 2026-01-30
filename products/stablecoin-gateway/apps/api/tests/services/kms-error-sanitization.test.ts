import { KMSService } from '../../src/services/kms.service';
import { KMSClient } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';
import { logger } from '../../src/utils/logger';

// Mock AWS SDK
jest.mock('@aws-sdk/client-kms');

// Mock logger to capture error calls
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('KMS Error Sanitization (SEC-016)', () => {
  let kmsService: KMSService;
  let mockKMSClient: any;

  // Test wallet for generating valid public key fixtures
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

  async function primePublicKeyCache() {
    mockKMSClient.send.mockResolvedValueOnce({ PublicKey: buildMockDER() });
    await kmsService.getPublicKey();
    // Clear mock call history so tests can inspect only subsequent calls
    jest.clearAllMocks();
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockKMSClient = {
      send: jest.fn(),
    };

    (KMSClient as any).mockImplementation(() => mockKMSClient);

    kmsService = new KMSService({
      keyId: 'test-key-id',
      region: 'us-east-1',
    });
  });

  // ---- AWS-style errors that must never leak ----
  const awsErrors = [
    {
      name: 'AccessDeniedException',
      message:
        'User: arn:aws:iam::123456789012:role/MyRole is not authorized to perform: kms:Sign on resource: arn:aws:kms:us-east-1:123456789012:key/abcd-1234',
    },
    {
      name: 'NotFoundException',
      message:
        'Key arn:aws:kms:us-east-1:123456789012:key/abcd-1234 does not exist',
    },
    {
      name: 'KMSInternalException',
      message:
        'An internal error occurred in AWS KMS at endpoint kms.us-east-1.amazonaws.com',
    },
    {
      name: 'InvalidKeyUsageException',
      message:
        'arn:aws:kms:us-east-1:123456789012:key/abcd-1234 key usage is ENCRYPT_DECRYPT which is not valid for Sign',
    },
  ];

  function makeAwsError(template: { name: string; message: string }): Error {
    const err = new Error(template.message);
    err.name = template.name;
    return err;
  }

  describe('sign() error sanitization', () => {
    const validHash = ethers.id('test message');

    it('should NOT include AWS key ARN in re-thrown error message', async () => {
      await primePublicKeyCache();

      const awsErr = makeAwsError(awsErrors[0]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.sign(validHash);
        fail('Expected sign() to throw');
      } catch (error: any) {
        expect(error.message).not.toContain('arn:aws:kms');
        expect(error.message).not.toContain('123456789012');
      }
    });

    it('should NOT include IAM role details in re-thrown error', async () => {
      await primePublicKeyCache();

      const awsErr = makeAwsError(awsErrors[0]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.sign(validHash);
        fail('Expected sign() to throw');
      } catch (error: any) {
        expect(error.message).not.toContain('arn:aws:iam');
        expect(error.message).not.toContain('MyRole');
      }
    });

    it('should NOT include AWS region in re-thrown error', async () => {
      await primePublicKeyCache();

      const awsErr = makeAwsError(awsErrors[2]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.sign(validHash);
        fail('Expected sign() to throw');
      } catch (error: any) {
        expect(error.message).not.toContain('kms.us-east-1.amazonaws.com');
      }
    });

    it('should have a generic error message in production', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await primePublicKeyCache();

      const awsErr = makeAwsError(awsErrors[0]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.sign(validHash);
        fail('Expected sign() to throw');
      } catch (error: any) {
        expect(error.message).toBe('KMS signing failed');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('should include original message in non-production for debugging', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await primePublicKeyCache();

      const awsErr = makeAwsError(awsErrors[0]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.sign(validHash);
        fail('Expected sign() to throw');
      } catch (error: any) {
        expect(error.message).toContain('KMS signing failed');
        expect(error.message).toContain(awsErrors[0].message);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('should log the full original error before throwing', async () => {
      await primePublicKeyCache();

      const awsErr = makeAwsError(awsErrors[1]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.sign(validHash);
      } catch {
        // expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('KMS signing failed'),
        awsErr
      );
    });

    it('should NOT include original error details in AppError.details', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await primePublicKeyCache();

      const awsErr = makeAwsError(awsErrors[0]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.sign(validHash);
        fail('Expected sign() to throw');
      } catch (error: any) {
        // details should not contain the original error message
        if (error.details) {
          const detailsStr = JSON.stringify(error.details);
          expect(detailsStr).not.toContain('arn:aws');
          expect(detailsStr).not.toContain('123456789012');
        }
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  describe('getPublicKey() error sanitization', () => {
    it('should NOT include AWS details in re-thrown error', async () => {
      const awsErr = makeAwsError(awsErrors[0]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.getPublicKey();
        fail('Expected getPublicKey() to throw');
      } catch (error: any) {
        expect(error.message).not.toContain('arn:aws:kms');
        expect(error.message).not.toContain('arn:aws:iam');
        expect(error.message).not.toContain('123456789012');
      }
    });

    it('should return generic message in production', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const awsErr = makeAwsError(awsErrors[1]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.getPublicKey();
        fail('Expected getPublicKey() to throw');
      } catch (error: any) {
        expect(error.message).toBe('KMS public-key-retrieval failed');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('should log full error details for debugging', async () => {
      const awsErr = makeAwsError(awsErrors[3]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.getPublicKey();
      } catch {
        // expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('KMS public-key-retrieval failed'),
        awsErr
      );
    });
  });

  describe('getAddress() error sanitization', () => {
    it('should NOT include AWS details in re-thrown error', async () => {
      const awsErr = makeAwsError(awsErrors[0]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.getAddress();
        fail('Expected getAddress() to throw');
      } catch (error: any) {
        expect(error.message).not.toContain('arn:aws:kms');
        expect(error.message).not.toContain('arn:aws:iam');
      }
    });

    it('should return generic message in production', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const awsErr = makeAwsError(awsErrors[0]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.getAddress();
        fail('Expected getAddress() to throw');
      } catch (error: any) {
        expect(error.message).toBe('KMS address-derivation failed');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('should log full error details for debugging', async () => {
      const awsErr = makeAwsError(awsErrors[2]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      try {
        await kmsService.getAddress();
      } catch {
        // expected
      }

      // getAddress() delegates to getPublicKey(), which logs the original
      // AWS error. The outer getAddress() catch logs the sanitized AppError.
      // Verify the original AWS error was logged by the inner method.
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('KMS public-key-retrieval failed'),
        awsErr
      );
      // Also verify the outer method logged its own sanitized error
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('KMS address-derivation failed'),
        expect.any(Error)
      );
    });
  });

  describe('signTransaction() error sanitization', () => {
    it('should NOT include AWS details in re-thrown error', async () => {
      await primePublicKeyCache();

      const awsErr = makeAwsError(awsErrors[0]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      const toAddress = ethers.Wallet.createRandom().address;

      try {
        await kmsService.signTransaction({
          to: toAddress,
          value: ethers.parseEther('0.1'),
          gasLimit: 21000,
          maxFeePerGas: ethers.parseUnits('50', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
          nonce: 0,
          chainId: 137,
          type: 2,
        });
        fail('Expected signTransaction() to throw');
      } catch (error: any) {
        expect(error.message).not.toContain('arn:aws:kms');
        expect(error.message).not.toContain('arn:aws:iam');
        expect(error.message).not.toContain('123456789012');
      }
    });

    it('should return generic message in production', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await primePublicKeyCache();

      const awsErr = makeAwsError(awsErrors[0]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      const toAddress = ethers.Wallet.createRandom().address;

      try {
        await kmsService.signTransaction({
          to: toAddress,
          value: ethers.parseEther('0.1'),
          gasLimit: 21000,
          maxFeePerGas: ethers.parseUnits('50', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
          nonce: 0,
          chainId: 137,
          type: 2,
        });
        fail('Expected signTransaction() to throw');
      } catch (error: any) {
        expect(error.message).toBe('KMS transaction-signing failed');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('should log full error details for debugging', async () => {
      await primePublicKeyCache();

      const awsErr = makeAwsError(awsErrors[3]);
      mockKMSClient.send.mockRejectedValueOnce(awsErr);

      const toAddress = ethers.Wallet.createRandom().address;

      try {
        await kmsService.signTransaction({
          to: toAddress,
          value: ethers.parseEther('0.1'),
          gasLimit: 21000,
          maxFeePerGas: ethers.parseUnits('50', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
          nonce: 0,
          chainId: 137,
          type: 2,
        });
      } catch {
        // expected
      }

      // signTransaction() delegates to sign(), which logs the original
      // AWS error. The outer signTransaction() catch logs the sanitized
      // AppError. Verify the original was logged by the inner method.
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('KMS signing failed'),
        awsErr
      );
      // Also verify the outer method logged its own sanitized error
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('KMS transaction-signing failed'),
        expect.any(Error)
      );
    });
  });

  describe('sanitization across all AWS error types', () => {
    const validHash = ethers.id('test message');

    for (const awsError of awsErrors) {
      it(`should sanitize ${awsError.name} from sign()`, async () => {
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        await primePublicKeyCache();

        mockKMSClient.send.mockRejectedValueOnce(makeAwsError(awsError));

        try {
          await kmsService.sign(validHash);
          fail('Expected sign() to throw');
        } catch (error: any) {
          // Ensure no AWS identifiers leak
          expect(error.message).not.toContain('arn:aws');
          expect(error.message).not.toContain('123456789012');
          expect(error.message).not.toContain('amazonaws.com');
          expect(error.message).toBe('KMS signing failed');
        } finally {
          process.env.NODE_ENV = origEnv;
        }
      });
    }
  });
});
