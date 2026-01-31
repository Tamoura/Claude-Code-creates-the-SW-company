/**
 * KMS Signing Service
 *
 * Handles ECDSA signing operations via AWS KMS:
 * - Raw message hash signing
 * - Ethereum transaction signing
 * - Recovery parameter (v) determination
 *
 * Separated from KMSService to isolate signing logic
 * from key management and health check concerns.
 */

import { KMSClient, SignCommand } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';
import * as asn1 from 'asn1.js';
import { AppError } from '../types/index.js';
import { logger } from '../utils/logger.js';

// ASN.1 schema for parsing DER-encoded ECDSA signature
const ECDSASigValue = asn1.define('ECDSASigValue', function (this: any) {
  this.seq().obj(this.key('r').int(), this.key('s').int());
});

// secp256k1 curve order constants
const SECP256K1_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
const SECP256K1_HALF_N = SECP256K1_N / BigInt(2);

/**
 * Sanitize KMS errors to prevent leaking AWS implementation details.
 */
export function sanitizeKmsError(error: unknown, operation: string): AppError {
  logger.error(`KMS ${operation} failed`, error);

  if (process.env.NODE_ENV === 'development') {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new AppError(500, `kms-${operation}-error`, `KMS ${operation} failed: ${msg}`);
  }

  return new AppError(500, `kms-${operation}-error`, `KMS ${operation} failed`);
}

export interface AddressProvider {
  getAddress(): Promise<string>;
}

export class KMSSigningService {
  constructor(
    private client: KMSClient,
    private keyId: string,
    private addressProvider: AddressProvider
  ) {}

  /**
   * Sign arbitrary data (message hash) using KMS
   *
   * @param messageHash - 32-byte message hash (0x-prefixed hex string)
   * @returns Ethereum signature object with r, s, v
   */
  async sign(messageHash: string): Promise<ethers.Signature> {
    try {
      if (!messageHash.startsWith('0x') || messageHash.length !== 66) {
        throw new Error('Message hash must be a 32-byte hex string with 0x prefix');
      }

      const messageHashBuffer = Buffer.from(messageHash.slice(2), 'hex');

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

      const signatureBuffer = Buffer.from(response.Signature);
      const decoded = ECDSASigValue.decode(signatureBuffer, 'der');

      let r = BigInt('0x' + decoded.r.toString(16));
      let s = BigInt('0x' + decoded.s.toString(16));

      // Ensure s is in lower half of curve order (EIP-2)
      if (s > SECP256K1_HALF_N) {
        s = SECP256K1_N - s;
      }

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
   * Sign a transaction using KMS
   */
  async signTransaction(transaction: ethers.TransactionRequest): Promise<string> {
    try {
      if (!transaction.to) {
        throw new Error('Transaction must have a "to" address');
      }

      const unsignedTx: ethers.TransactionLike = {
        to: String(transaction.to),
        value: transaction.value || 0,
        data: transaction.data || '0x',
        gasLimit: transaction.gasLimit || 21000,
        gasPrice: transaction.gasPrice || undefined,
        maxFeePerGas: transaction.maxFeePerGas || undefined,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas || undefined,
        nonce: transaction.nonce || undefined,
        chainId: transaction.chainId || 137,
        type: transaction.type || 2,
      };

      const tx = ethers.Transaction.from(unsignedTx);
      const txHash = ethers.keccak256(tx.unsignedSerialized);

      const signature = await this.sign(txHash);

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
   * Find the correct recovery parameter (v) for ECDSA signature
   */
  async findRecoveryParam(
    messageHash: string,
    r: bigint,
    s: bigint
  ): Promise<number> {
    const expectedAddress = await this.addressProvider.getAddress();

    for (const v of [27, 28]) {
      try {
        const sig = ethers.Signature.from({
          r: '0x' + r.toString(16).padStart(64, '0'),
          s: '0x' + s.toString(16).padStart(64, '0'),
          v,
        });

        const recoveredAddress = ethers.recoverAddress(messageHash, sig);
        if (recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()) {
          return v;
        }
      } catch {
        // Try next v
      }
    }

    throw new Error('Could not determine recovery parameter (v) for signature');
  }
}
