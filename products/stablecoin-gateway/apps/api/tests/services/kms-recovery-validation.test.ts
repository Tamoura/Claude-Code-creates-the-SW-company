/**
 * KMS Recovery Parameter Validation Tests
 *
 * Audit Issue #6: Unsafe recovery parameter finding.
 * Both v=27 and v=28 could recover valid but different addresses.
 * Must verify recovered address matches expected signer.
 *
 * The findRecoveryParam method lives on KMSSigningService, not
 * KMSService directly. KMSService delegates signing to
 * KMSSigningService which owns the recovery logic.
 */

import { ethers } from 'ethers';

// Mock KMS client to control signing behavior
jest.mock('@aws-sdk/client-kms', () => ({
  KMSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  SignCommand: jest.fn(),
  GetPublicKeyCommand: jest.fn(),
}));

// Mock asn1.js since KMSSigningService imports it
jest.mock('asn1.js', () => ({
  define: jest.fn().mockReturnValue({
    decode: jest.fn(),
  }),
}));

import { KMSSigningService } from '../../src/services/kms-signing.service';
import { KMSClient } from '@aws-sdk/client-kms';

describe('KMS recovery parameter validation', () => {
  it('should throw when neither v=27 nor v=28 recovers expected address', async () => {
    const mockClient = new KMSClient({});

    // Create an address provider that returns an address that won't match
    const addressProvider = {
      getAddress: jest.fn().mockResolvedValue('0x1111111111111111111111111111111111111111'),
    };

    const signingService = new KMSSigningService(
      mockClient,
      'test-key-id',
      addressProvider
    );

    // Call findRecoveryParam with arbitrary r, s values
    // Neither v=27 nor v=28 will recover 0x1111...
    const messageHash = ethers.keccak256(Buffer.from('test'));
    const r = BigInt('0x' + 'ab'.repeat(32));
    const s = BigInt('0x' + 'cd'.repeat(32));

    await expect(
      signingService.findRecoveryParam(messageHash, r, s)
    ).rejects.toThrow('Could not determine recovery parameter');
  });

  it('should select correct v when the matching recovery param is found', async () => {
    // Generate a known keypair
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;

    const mockClient = new KMSClient({});

    // Create an address provider that returns the wallet's address
    const addressProvider = {
      getAddress: jest.fn().mockResolvedValue(address),
    };

    const signingService = new KMSSigningService(
      mockClient,
      'test-key-id',
      addressProvider
    );

    // Sign a message with the wallet to get a known-good signature
    const messageHash = ethers.keccak256(Buffer.from('test-message'));
    const sig = wallet.signingKey.sign(messageHash);

    // Call findRecoveryParam with the known r, s
    const result = await signingService.findRecoveryParam(
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
