import { KMSClient, SignCommand, GetPublicKeyCommand } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';
import * as asn1 from 'asn1.js';
import { AppError } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * AWS KMS Service for secure private key management and transaction signing
 *
 * This service uses AWS Key Management Service (KMS) to:
 * - Store private keys securely (never exposed in application memory)
 * - Sign Ethereum transactions using ECDSA with SECP256K1 curve
 * - Derive Ethereum addresses from KMS public keys
 *
 * Security:
 * - Private keys never leave AWS KMS
 * - All signing operations occur within KMS
 * - Supports key rotation and audit logging
 *
 * Requirements:
 * - KMS key must be Asymmetric with key spec ECC_SECG_P256K1
 * - IAM permissions: kms:Sign, kms:GetPublicKey
 */

// ASN.1 schema for parsing DER-encoded ECDSA signature
const ECDSASigValue = asn1.define('ECDSASigValue', function (this: any) {
  this.seq().obj(this.key('r').int(), this.key('s').int());
});

interface KMSConfig {
  keyId: string;
  region?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Sanitize KMS errors to prevent leaking AWS implementation details.
 *
 * Always logs the full original error for debugging, then returns
 * a sanitized AppError. In production the message is generic; in
 * development the original message is appended for convenience.
 */
function sanitizeKmsError(error: unknown, operation: string): AppError {
  // Log the full error for debugging (before sanitizing)
  logger.error(`KMS ${operation} failed`, error);

  // In development mode only, include the original message for convenience.
  // In all other environments (production, test, etc.) use a generic message
  // to prevent leaking AWS key ARNs, regions, or IAM details.
  if (process.env.NODE_ENV === 'development') {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new AppError(500, `kms-${operation}-error`, `KMS ${operation} failed: ${msg}`);
  }

  return new AppError(500, `kms-${operation}-error`, `KMS ${operation} failed`);
}

export class KMSService {
  private client: KMSClient;
  private keyId: string;
  private publicKeyCache: string | null = null;
  private addressCache: string | null = null;
  private maxRetries: number;

  constructor(config: KMSConfig) {
    if (!config.keyId) {
      throw new AppError(500, 'kms-config-error', 'KMS Key ID is required');
    }

    this.keyId = config.keyId;
    this.maxRetries = config.maxRetries || 3;

    this.client = new KMSClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      maxAttempts: this.maxRetries,
      requestHandler: {
        requestTimeout: config.timeout || 30000,
      } as any,
    });
  }

  /**
   * Get the Ethereum address derived from the KMS public key
   * Result is cached after first retrieval
   */
  async getAddress(): Promise<string> {
    if (this.addressCache) {
      return this.addressCache;
    }

    try {
      const publicKey = await this.getPublicKey();

      // Derive Ethereum address from uncompressed public key (0x04 + X + Y).
      // Per Ethereum spec, we strip the 04 uncompressed-point prefix, leaving
      // only the 64-byte raw X,Y coordinates, then hash with Keccak-256.
      // publicKey is '0x04...' so slice(4) removes both '0x' and '04'.
      const publicKeyBytes = Buffer.from(publicKey.slice(4), 'hex');
      const hash = ethers.keccak256(publicKeyBytes);
      const address = ethers.getAddress('0x' + hash.slice(-40));

      this.addressCache = address;
      return address;
    } catch (error) {
      throw sanitizeKmsError(error, 'address-derivation');
    }
  }

  /**
   * Get the uncompressed public key from KMS
   * Returns hex string with '04' prefix
   */
  async getPublicKey(): Promise<string> {
    if (this.publicKeyCache) {
      return this.publicKeyCache;
    }

    try {
      const command = new GetPublicKeyCommand({
        KeyId: this.keyId,
      });

      const response = await this.client.send(command);

      if (!response.PublicKey) {
        throw new Error('No public key returned from KMS');
      }

      // Parse DER-encoded public key (SubjectPublicKeyInfo format)
      const publicKeyDer = Buffer.from(response.PublicKey);

      // Extract the raw public key bytes (last 65 bytes for uncompressed SECP256K1)
      // DER format: algorithm identifier + public key
      // For SECP256K1, the public key is 65 bytes (04 + 32 bytes X + 32 bytes Y)
      const publicKeyBytes = publicKeyDer.slice(-65);

      if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
        throw new Error('Invalid public key format from KMS');
      }

      const publicKey = '0x' + publicKeyBytes.toString('hex');
      this.publicKeyCache = publicKey;

      return publicKey;
    } catch (error) {
      throw sanitizeKmsError(error, 'public-key-retrieval');
    }
  }

  /**
   * Sign a transaction using KMS
   *
   * @param transaction - Unsigned Ethereum transaction object
   * @returns Signed transaction hex string (ready to broadcast)
   */
  async signTransaction(transaction: ethers.TransactionRequest): Promise<string> {
    try {
      // Validate transaction
      if (!transaction.to) {
        throw new Error('Transaction must have a "to" address');
      }

      // Create unsigned transaction
      const unsignedTx: ethers.TransactionLike = {
        to: String(transaction.to),
        value: transaction.value || 0,
        data: transaction.data || '0x',
        gasLimit: transaction.gasLimit || 21000,
        gasPrice: transaction.gasPrice || undefined,
        maxFeePerGas: transaction.maxFeePerGas || undefined,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas || undefined,
        nonce: transaction.nonce || undefined,
        chainId: transaction.chainId || 137, // Polygon mainnet default
        type: transaction.type || 2, // EIP-1559
      };

      // Serialize the transaction and hash with Keccak-256 (Ethereum standard).
      // This hash is passed to sign() which sends it to KMS as a DIGEST.
      const tx = ethers.Transaction.from(unsignedTx);
      const txHash = ethers.keccak256(tx.unsignedSerialized);

      // Sign with KMS
      const signature = await this.sign(txHash);

      // Create signed transaction
      const signedTxLike: ethers.TransactionLike = {
        ...unsignedTx,
        signature: signature,
      };

      const signedTx = ethers.Transaction.from(signedTxLike);

      return signedTx.serialized;
    } catch (error) {
      throw sanitizeKmsError(error, 'transaction-signing');
    }
  }

  /**
   * Sign arbitrary data (message hash) using KMS
   *
   * @param messageHash - 32-byte message hash (0x-prefixed hex string)
   * @returns Ethereum signature object with r, s, v
   */
  async sign(messageHash: string): Promise<ethers.Signature> {
    try {
      // Validate input
      if (!messageHash.startsWith('0x') || messageHash.length !== 66) {
        throw new Error('Message hash must be a 32-byte hex string with 0x prefix');
      }

      const messageHashBuffer = Buffer.from(messageHash.slice(2), 'hex');

      // IMPORTANT: Ethereum uses Keccak-256 for message hashing, not SHA-256.
      // We use MessageType: 'DIGEST' which tells KMS to sign the provided bytes
      // directly without additional hashing. The 'ECDSA_SHA_256' algorithm refers
      // to the key type (secp256k1 ECDSA), not the hash applied to the digest.
      // This correctly signs our Keccak-256 hash as a raw ECDSA operation.
      const command = new SignCommand({
        KeyId: this.keyId,
        Message: messageHashBuffer,
        MessageType: 'DIGEST',
        SigningAlgorithm: 'ECDSA_SHA_256',
      });

      const response = await this.client.send(command);

      if (!response.Signature) {
        throw new Error('No signature returned from KMS');
      }

      // Parse DER-encoded signature
      const signatureBuffer = Buffer.from(response.Signature);
      const decoded = ECDSASigValue.decode(signatureBuffer, 'der');

      let r = BigInt('0x' + decoded.r.toString(16));
      let s = BigInt('0x' + decoded.s.toString(16));

      // Ensure s is in lower half of curve order (EIP-2)
      const secp256k1N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
      const secp256k1HalfN = secp256k1N / BigInt(2);

      if (s > secp256k1HalfN) {
        s = secp256k1N - s;
      }

      // Calculate recovery parameter (v)
      // For Ethereum, we need to determine v by trying both options (27 and 28)
      const v = await this.findRecoveryParam(messageHash, r, s);

      return ethers.Signature.from({
        r: '0x' + r.toString(16).padStart(64, '0'),
        s: '0x' + s.toString(16).padStart(64, '0'),
        v,
      });
    } catch (error) {
      throw sanitizeKmsError(error, 'signing');
    }
  }

  /**
   * Find the correct recovery parameter (v) for ECDSA signature
   * Tries v = 27 and v = 28 to see which one recovers the correct public key
   */
  private async findRecoveryParam(
    messageHash: string,
    r: bigint,
    s: bigint
  ): Promise<number> {
    const expectedAddress = await this.getAddress();

    // Try v = 27
    try {
      const sig27 = ethers.Signature.from({
        r: '0x' + r.toString(16).padStart(64, '0'),
        s: '0x' + s.toString(16).padStart(64, '0'),
        v: 27,
      });

      const recoveredAddress = ethers.recoverAddress(messageHash, sig27);
      if (recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()) {
        return 27;
      }
    } catch {
      // Try v = 28
    }

    // Try v = 28
    try {
      const sig28 = ethers.Signature.from({
        r: '0x' + r.toString(16).padStart(64, '0'),
        s: '0x' + s.toString(16).padStart(64, '0'),
        v: 28,
      });

      const recoveredAddress = ethers.recoverAddress(messageHash, sig28);
      if (recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()) {
        return 28;
      }
    } catch {
      // Neither worked
    }

    throw new Error('Could not determine recovery parameter (v) for signature');
  }

  /**
   * Clear cached values (useful for key rotation)
   */
  clearCache(): void {
    this.publicKeyCache = null;
    this.addressCache = null;
  }

  /**
   * Rotate to a new KMS key. Clears all caches and updates the key ID.
   * Used during emergency key rotation or scheduled rotation.
   */
  rotateKey(newKeyId: string): void {
    logger.warn('KMS key rotation initiated', {
      oldKeyId: this.keyId.substring(0, 8) + '...',
      newKeyId: newKeyId.substring(0, 8) + '...',
    });
    this.keyId = newKeyId;
    this.clearCache();
  }

  /**
   * Health check: verify the current KMS key is accessible and functional.
   * Returns true if getPublicKey succeeds, false otherwise.
   */
  async isKeyHealthy(): Promise<boolean> {
    try {
      await this.getPublicKey();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test KMS connectivity and permissions
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    try {
      await this.getPublicKey();
      return {
        status: 'healthy',
        message: 'KMS connection successful',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Factory function to create KMS service from environment variables
 */
export function createKMSService(): KMSService {
  const keyId = process.env.KMS_KEY_ID || process.env.AWS_KMS_KEY_ID;

  if (!keyId) {
    throw new AppError(
      500,
      'kms-not-configured',
      'KMS_KEY_ID environment variable is required'
    );
  }

  return new KMSService({
    keyId,
    region: process.env.AWS_REGION,
    maxRetries: parseInt(process.env.KMS_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.KMS_TIMEOUT || '30000', 10),
  });
}
