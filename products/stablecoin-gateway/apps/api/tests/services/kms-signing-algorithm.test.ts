import { KMSService } from '../../src/services/kms.service';
import { KMSClient, SignCommand, GetPublicKeyCommand } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';

// Mock AWS SDK
jest.mock('@aws-sdk/client-kms');

/**
 * KMS Signing Algorithm Tests
 *
 * Verifies that the KMS signing flow correctly handles Ethereum's
 * Keccak-256 hashing requirement:
 *
 * - MessageType: 'DIGEST' tells KMS to sign provided bytes directly
 *   (no additional hashing). We pre-hash with Keccak-256.
 * - 'ECDSA_SHA_256' is the key type label, not a hash operation.
 * - The Keccak-256 digest must be passed as-is (no double hashing).
 * - Ethereum address derivation must strip the 04 uncompressed prefix
 *   before keccak256 hashing.
 */
describe('KMS Signing Algorithm for Ethereum', () => {
  let kmsService: KMSService;
  let mockKMSClient: any;

  // Deterministic test key pair
  const testPrivateKey =
    '0x1234567890123456789012345678901234567890123456789012345678901234';
  const testWallet = new ethers.Wallet(testPrivateKey);
  const testPublicKey = testWallet.signingKey.publicKey;
  const testAddress = testWallet.address;

  function buildMockDERPublicKey(): Buffer {
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

  function signWithTestWallet(messageHash: string): Buffer {
    const sig = testWallet.signingKey.sign(messageHash);
    return buildDERSignature(sig.r.slice(2), sig.s.slice(2));
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockKMSClient = { send: jest.fn() };
    (KMSClient as any).mockImplementation(() => mockKMSClient);

    kmsService = new KMSService({
      keyId: 'test-key-id',
      region: 'us-east-1',
    });
  });

  /**
   * Prime public key cache and queue sign response.
   * Call order: GetPublicKey (cached) then Sign response.
   */
  async function setupForSign(messageHash: string) {
    // Prime cache
    mockKMSClient.send.mockResolvedValueOnce({
      PublicKey: buildMockDERPublicKey(),
    });
    await kmsService.getPublicKey();

    // Queue sign response
    mockKMSClient.send.mockResolvedValueOnce({
      Signature: signWithTestWallet(messageHash),
    });
  }

  describe('SignCommand parameters', () => {
    it('should use MessageType DIGEST to sign bytes directly without re-hashing', async () => {
      const messageHash = ethers.keccak256(
        ethers.toUtf8Bytes('test message')
      );
      await setupForSign(messageHash);

      await kmsService.sign(messageHash);

      expect(SignCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageType: 'DIGEST',
        })
      );
    });

    it('should use SigningAlgorithm ECDSA_SHA_256 (key type, not hash operation)', async () => {
      const messageHash = ethers.keccak256(
        ethers.toUtf8Bytes('algo test')
      );
      await setupForSign(messageHash);

      await kmsService.sign(messageHash);

      expect(SignCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          SigningAlgorithm: 'ECDSA_SHA_256',
        })
      );
    });

    it('should pass the exact Keccak-256 hash bytes without additional hashing', async () => {
      const rawMessage = 'important transaction data';
      const keccakHash = ethers.keccak256(ethers.toUtf8Bytes(rawMessage));
      const expectedBytes = Buffer.from(keccakHash.slice(2), 'hex');

      await setupForSign(keccakHash);

      await kmsService.sign(keccakHash);

      expect(SignCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expectedBytes,
        })
      );
    });

    it('should NOT double-hash: bytes to KMS equal the Keccak-256 output', async () => {
      const keccakDigest = ethers.keccak256(
        ethers.toUtf8Bytes('no double hashing')
      );
      await setupForSign(keccakDigest);

      await kmsService.sign(keccakDigest);

      const signCalls = (SignCommand as unknown as jest.Mock).mock.calls;
      expect(signCalls.length).toBe(1);
      const sentMessage = signCalls[0][0].Message as Buffer;
      const sentHex = '0x' + sentMessage.toString('hex');
      expect(sentHex).toBe(keccakDigest);
    });
  });

  describe('Keccak-256 hashing in signTransaction', () => {
    it('should hash the unsigned serialized tx with ethers.keccak256', async () => {
      const toAddress = ethers.Wallet.createRandom().address;
      const transaction = {
        to: toAddress,
        value: ethers.parseEther('1.0'),
        gasLimit: 21000,
        maxFeePerGas: ethers.parseUnits('30', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
        nonce: 5,
        chainId: 137,
        type: 2,
      };

      // Compute expected Keccak-256 hash
      const tx = ethers.Transaction.from({
        to: String(transaction.to),
        value: transaction.value,
        data: '0x',
        gasLimit: transaction.gasLimit,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
        nonce: transaction.nonce,
        chainId: transaction.chainId,
        type: transaction.type,
      });
      const expectedHash = ethers.keccak256(tx.unsignedSerialized);
      const expectedBytes = Buffer.from(expectedHash.slice(2), 'hex');

      await setupForSign(expectedHash);

      await kmsService.signTransaction(transaction);

      expect(SignCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expectedBytes,
          MessageType: 'DIGEST',
        })
      );
    });
  });

  describe('Ethereum address derivation', () => {
    it('should derive the correct Ethereum address by stripping the 04 prefix before hashing', async () => {
      mockKMSClient.send.mockResolvedValueOnce({
        PublicKey: buildMockDERPublicKey(),
      });

      const address = await kmsService.getAddress();

      // The correct Ethereum address is derived by:
      // 1. Taking the uncompressed public key (04 + X + Y)
      // 2. Removing the 04 prefix to get raw X,Y coordinates (64 bytes)
      // 3. Keccak-256 hashing the 64 bytes
      // 4. Taking the last 20 bytes as the address
      expect(address.toLowerCase()).toBe(testAddress.toLowerCase());
    });
  });

  describe('Signature recovery produces valid Ethereum address', () => {
    it('should produce a signature that recovers to the KMS key address', async () => {
      const messageHash = ethers.keccak256(
        ethers.toUtf8Bytes('recover me')
      );
      await setupForSign(messageHash);

      const signature = await kmsService.sign(messageHash);

      const recoveredAddress = ethers.recoverAddress(
        messageHash,
        signature
      );
      expect(recoveredAddress.toLowerCase()).toBe(
        testAddress.toLowerCase()
      );
    });

    it('should produce valid r, s, v signature components', async () => {
      const messageHash = ethers.keccak256(
        ethers.toUtf8Bytes('components check')
      );
      await setupForSign(messageHash);

      const signature = await kmsService.sign(messageHash);

      expect(signature.r).toMatch(/^0x[0-9a-f]{64}$/);
      expect(signature.s).toMatch(/^0x[0-9a-f]{64}$/);
      expect([27, 28]).toContain(signature.v);
    });

    it('should recover the correct from-address in a signed transaction', async () => {
      const toAddress = ethers.Wallet.createRandom().address;
      const transaction = {
        to: toAddress,
        value: ethers.parseEther('0.5'),
        gasLimit: 21000,
        maxFeePerGas: ethers.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
        nonce: 0,
        chainId: 137,
        type: 2,
      };

      const tx = ethers.Transaction.from({
        to: String(transaction.to),
        value: transaction.value,
        data: '0x',
        gasLimit: transaction.gasLimit,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
        nonce: transaction.nonce,
        chainId: transaction.chainId,
        type: transaction.type,
      });
      const txHash = ethers.keccak256(tx.unsignedSerialized);

      await setupForSign(txHash);

      const signedTxHex = await kmsService.signTransaction(transaction);

      const signedTx = ethers.Transaction.from(signedTxHex);
      expect(signedTx.from!.toLowerCase()).toBe(
        testAddress.toLowerCase()
      );
    });
  });
});
