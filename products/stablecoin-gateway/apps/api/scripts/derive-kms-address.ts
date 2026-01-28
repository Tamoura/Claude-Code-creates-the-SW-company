#!/usr/bin/env tsx

/**
 * Script to derive Ethereum address from AWS KMS key
 *
 * Usage:
 *   tsx scripts/derive-kms-address.ts <KMS_KEY_ID>
 *   tsx scripts/derive-kms-address.ts arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
 *
 * Environment variables:
 *   AWS_REGION - AWS region (default: us-east-1)
 *   AWS_PROFILE - AWS profile to use (optional)
 */

import { KMSService } from '../src/services/kms.service.js';

async function main() {
  const keyId = process.argv[2];

  if (!keyId) {
    console.error('❌ Error: KMS Key ID is required');
    console.error('');
    console.error('Usage:');
    console.error('  tsx scripts/derive-kms-address.ts <KMS_KEY_ID>');
    console.error('');
    console.error('Example:');
    console.error('  tsx scripts/derive-kms-address.ts arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012');
    process.exit(1);
  }

  console.log('🔑 Deriving Ethereum address from KMS key...');
  console.log('');

  try {
    // Create KMS service
    const kmsService = new KMSService({
      keyId,
      region: process.env.AWS_REGION || 'us-east-1',
    });

    // Health check
    console.log('⏳ Testing KMS connectivity...');
    const health = await kmsService.healthCheck();

    if (health.status !== 'healthy') {
      throw new Error(`KMS health check failed: ${health.message}`);
    }

    console.log('✅ KMS connection successful');
    console.log('');

    // Get public key
    console.log('⏳ Retrieving public key...');
    const publicKey = await kmsService.getPublicKey();
    console.log('✅ Public key retrieved');
    console.log(`   ${publicKey.slice(0, 20)}...${publicKey.slice(-20)}`);
    console.log('');

    // Derive address
    console.log('⏳ Deriving Ethereum address...');
    const address = await kmsService.getAddress();
    console.log('✅ Address derived successfully');
    console.log('');

    // Display results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 KMS Key Information');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('KMS Key ID:');
    console.log(`  ${keyId}`);
    console.log('');
    console.log('Ethereum Address:');
    console.log(`  ${address}`);
    console.log('');
    console.log('Public Key (uncompressed):');
    console.log(`  ${publicKey}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    console.log('⚠️  IMPORTANT NEXT STEPS:');
    console.log('');
    console.log('1. Fund this address with native tokens for gas:');
    console.log('   - Ethereum: Send ETH to this address');
    console.log('   - Polygon: Send MATIC to this address');
    console.log('   - Binance Smart Chain: Send BNB to this address');
    console.log('');
    console.log('2. Set environment variable in your deployment:');
    console.log(`   KMS_KEY_ID="${keyId}"`);
    console.log('');
    console.log('3. Ensure IAM role has these KMS permissions:');
    console.log('   - kms:GetPublicKey');
    console.log('   - kms:Sign');
    console.log('');
    console.log('4. Test signing with this key:');
    console.log('   npm run test:kms');
    console.log('');

    // Check balance (optional)
    console.log('💡 TIP: Check the balance before deploying:');
    console.log(`   - Etherscan: https://etherscan.io/address/${address}`);
    console.log(`   - Polygonscan: https://polygonscan.com/address/${address}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    console.error('');

    if (error instanceof Error && error.message.includes('AccessDenied')) {
      console.error('💡 Troubleshooting:');
      console.error('   - Verify AWS credentials are configured: aws sts get-caller-identity');
      console.error('   - Check IAM permissions for kms:GetPublicKey and kms:Sign');
      console.error('   - Verify the KMS key exists: aws kms describe-key --key-id <KEY_ID>');
      console.error('');
    }

    if (error instanceof Error && error.message.includes('not found')) {
      console.error('💡 Troubleshooting:');
      console.error('   - Verify the KMS key ID is correct');
      console.error('   - Check the AWS region is correct (set AWS_REGION env var)');
      console.error('   - List your KMS keys: aws kms list-keys');
      console.error('');
    }

    process.exit(1);
  }
}

main();
