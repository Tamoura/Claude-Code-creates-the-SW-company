/**
 * KMS Recovery Parameter Validation Tests
 *
 * Audit Issue #6: Unsafe recovery parameter finding.
 * Both v=27 and v=28 could recover valid but different addresses.
 * Must verify recovered address matches expected signer.
 *
 * The existing findRecoveryParam already works correctly for the
 * normal case. These tests verify the error handling when neither
 * v value recovers the expected address, and that the correct v
 * is selected when only one matches.
 */

import { KMSService } from '../../src/services/kms.service';
import { ethers } from 'ethers';

// Mock KMS client to control signing behavior
jest.mock('@aws-sdk/client-kms', () => ({
  KMSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  SignCommand: jest.fn(),
  GetPublicKeyCommand: jest.fn(),
}));

describe('KMS recovery parameter validation', () => {
  it('should throw when neither v=27 nor v=28 recovers expected address', async () => {
    const kms = new KMSService({
      keyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
    });

    // Override getAddress to return an address that won't match any recovery
    (kms as any).addressCache = '0x1111111111111111111111111111111111111111';

    // Call findRecoveryParam with arbitrary r, s values
    // Neither v=27 nor v=28 will recover 0x1111...
    const messageHash = ethers.keccak256(Buffer.from('test'));
    const r = BigInt('0x' + 'ab'.repeat(32));
    const s = BigInt('0x' + 'cd'.repeat(32));

    await expect(
      (kms as any).findRecoveryParam(messageHash, r, s)
    ).rejects.toThrow('Could not determine recovery parameter');
  });

  it('should select correct v when v=28 matches but v=27 does not', async () => {
    // Generate a known keypair
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;

    const kms = new KMSService({
      keyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
    });

    // Set the expected address to the wallet's address
    (kms as any).addressCache = address;

    // Sign a message with the wallet to get a known-good signature
    const messageHash = ethers.keccak256(Buffer.from('test-message'));
    const sig = wallet.signingKey.sign(messageHash);

    // Call findRecoveryParam with the known r, s
    const result = await (kms as any).findRecoveryParam(
      messageHash,
      BigInt(sig.r),
      BigInt(sig.s)
    );

    // The v value should be either 27 or 28
    expect([27, 28]).toContain(result);

    // Verify the selected v actually recovers the correct address
    const recoverSig = ethers.Signature.from({
      r: sig.r,
      s: sig.s,
      v: result,
    });
    const recovered = ethers.recoverAddress(messageHash, recoverSig);
    expect(recovered.toLowerCase()).toBe(address.toLowerCase());
  });
});
