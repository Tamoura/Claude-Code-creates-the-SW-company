# AWS KMS Setup Guide for Stablecoin Gateway

This guide provides step-by-step instructions for setting up AWS Key Management Service (KMS) to securely manage private keys for the Stablecoin Gateway hot wallet.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Creating a KMS Key](#creating-a-kms-key)
- [IAM Permissions](#iam-permissions)
- [Deriving the Ethereum Address](#deriving-the-ethereum-address)
- [Environment Configuration](#environment-configuration)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Key Rotation](#key-rotation)
- [Troubleshooting](#troubleshooting)

## Overview

AWS KMS provides hardware-based cryptographic key storage and operations. For Stablecoin Gateway:

- **Private keys never leave KMS** - signing operations occur inside AWS KMS hardware
- **Audit trail** - all operations are logged in CloudTrail
- **Access control** - IAM policies control who can use the key
- **FIPS 140-2 Level 2 compliant** - meets regulatory requirements

## Prerequisites

- AWS CLI installed and configured: `aws configure`
- AWS account with permissions to create KMS keys
- IAM permissions to create/manage keys
- Node.js 20+ installed

## Creating a KMS Key

### Step 1: Create the KMS Key

Create an asymmetric KMS key with the SECP256K1 curve (same as Ethereum):

```bash
# For staging environment
aws kms create-key \
  --key-spec ECC_SECG_P256K1 \
  --key-usage SIGN_VERIFY \
  --description "Stablecoin Gateway Staging Hot Wallet" \
  --tags \
    TagKey=Environment,TagValue=staging \
    TagKey=Application,TagValue=stablecoin-gateway \
    TagKey=Purpose,TagValue=hot-wallet \
  --region us-east-1
```

The response will include the Key ID:

```json
{
  "KeyMetadata": {
    "KeyId": "12345678-1234-1234-1234-123456789012",
    "Arn": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
    ...
  }
}
```

### Step 2: Create an Alias (Optional but Recommended)

```bash
aws kms create-alias \
  --alias-name alias/stablecoin-gateway-staging-wallet \
  --target-key-id 12345678-1234-1234-1234-123456789012 \
  --region us-east-1
```

### Step 3: Enable CloudTrail Logging

```bash
# Create a CloudTrail trail if you don't have one
aws cloudtrail create-trail \
  --name stablecoin-gateway-kms-audit \
  --s3-bucket-name your-cloudtrail-bucket

# Start logging
aws cloudtrail start-logging \
  --name stablecoin-gateway-kms-audit
```

## IAM Permissions

### For ECS/EC2 Task Execution Role

Create an IAM policy for the application:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowKMSSigningOperations",
      "Effect": "Allow",
      "Action": [
        "kms:GetPublicKey",
        "kms:Sign"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
      "Condition": {
        "StringEquals": {
          "kms:SigningAlgorithm": "ECDSA_SHA_256"
        }
      }
    },
    {
      "Sid": "AllowDescribeKey",
      "Effect": "Allow",
      "Action": [
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/*"
    }
  ]
}
```

Attach this policy to your ECS task role or EC2 instance profile.

### For Developers (Local Development)

```bash
# Add to ~/.aws/config
[profile stablecoin-dev]
region = us-east-1

# Grant your IAM user access via key policy
aws kms put-key-policy \
  --key-id 12345678-1234-1234-1234-123456789012 \
  --policy-name default \
  --policy file://kms-key-policy.json
```

`kms-key-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Enable IAM User Permissions",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow developers to use key",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/developer"
      },
      "Action": [
        "kms:GetPublicKey",
        "kms:Sign"
      ],
      "Resource": "*"
    }
  ]
}
```

## Deriving the Ethereum Address

After creating the KMS key, derive the Ethereum address:

```bash
# Navigate to API directory
cd apps/api

# Install dependencies if not already installed
npm install

# Derive address from KMS key
npm run kms:derive-address arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
```

Output:
```
🔑 Deriving Ethereum address from KMS key...

⏳ Testing KMS connectivity...
✅ KMS connection successful

⏳ Retrieving public key...
✅ Public key retrieved

⏳ Deriving Ethereum address...
✅ Address derived successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 KMS Key Information
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KMS Key ID:
  arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012

Ethereum Address:
  0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

Public Key (uncompressed):
  0x04...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**IMPORTANT**: Save this address - you'll need to fund it with gas tokens (MATIC, ETH, etc.) before deploying to production.

## Environment Configuration

### Staging Environment

Add to your `.env` or AWS Systems Manager Parameter Store:

```bash
# KMS Configuration
KMS_KEY_ID="arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
AWS_REGION="us-east-1"

# Optional: Retry configuration
KMS_MAX_RETRIES="3"
KMS_TIMEOUT="30000"
```

### Production Environment

```bash
# Use alias for easier key rotation
KMS_KEY_ID="alias/stablecoin-gateway-production-wallet"
AWS_REGION="us-east-1"
KMS_MAX_RETRIES="5"
KMS_TIMEOUT="30000"
```

### GitHub Actions Secrets

If using GitHub Actions for deployment:

1. Go to repository Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `AWS_ACCESS_KEY_ID` - IAM user access key
   - `AWS_SECRET_ACCESS_KEY` - IAM user secret key
   - `KMS_KEY_ID` - ARN or alias of your KMS key

## Testing

### Unit Tests

```bash
npm run test:kms
```

### Integration Test

Test signing a transaction:

```bash
# Set environment variables
export KMS_KEY_ID="your-key-id"
export AWS_REGION="us-east-1"

# Run a test transaction signature
node -e "
const { KMSService } = require('./dist/services/kms.service.js');
const kms = new KMSService({ keyId: process.env.KMS_KEY_ID });

(async () => {
  console.log('Testing KMS...');
  const health = await kms.healthCheck();
  console.log('Health check:', health);

  const address = await kms.getAddress();
  console.log('Wallet address:', address);

  console.log('✅ KMS is working correctly');
})();
"
```

### Test Transaction Signing

```bash
# Create a test transaction
cat > test-transaction.js << 'EOF'
const { KMSService } = require('./dist/services/kms.service.js');
const { ethers } = require('ethers');

async function testSigning() {
  const kms = new KMSService({ keyId: process.env.KMS_KEY_ID });

  const tx = {
    to: '0x0000000000000000000000000000000000000001',
    value: ethers.parseEther('0.01'),
    gasLimit: 21000,
    nonce: 0,
    chainId: 137,
    maxFeePerGas: ethers.parseUnits('50', 'gwei'),
    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
  };

  console.log('Signing test transaction...');
  const signedTx = await kms.signTransaction(tx);
  console.log('Signed transaction:', signedTx);
  console.log('✅ Transaction signing successful');
}

testSigning().catch(console.error);
EOF

node test-transaction.js
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] KMS key created with correct key spec (ECC_SECG_P256K1)
- [ ] IAM permissions configured correctly
- [ ] CloudTrail logging enabled
- [ ] Ethereum address derived and documented
- [ ] **Address funded with gas tokens** (CRITICAL!)
- [ ] Environment variables set in production
- [ ] KMS health check passes
- [ ] Test transaction signed successfully

### Fund the Wallet

**CRITICAL**: The derived Ethereum address must have gas tokens before it can sign transactions:

```bash
# For Polygon mainnet
# Send 0.5-1 MATIC to the derived address

# For Ethereum mainnet
# Send 0.01-0.05 ETH to the derived address

# Verify balance
# Polygon: https://polygonscan.com/address/YOUR_ADDRESS
# Ethereum: https://etherscan.io/address/YOUR_ADDRESS
```

### Deploy

```bash
# Set environment variables
export KMS_KEY_ID="alias/stablecoin-gateway-production-wallet"
export AWS_REGION="us-east-1"

# Build and deploy
npm run build
npm start

# Verify in logs
# Should see: "Environment validation successful"
```

## Key Rotation

AWS KMS supports key rotation. For Stablecoin Gateway, key rotation requires:

### Automatic Key Material Rotation

```bash
# Enable automatic rotation (for symmetric keys only)
# Note: Asymmetric keys don't support automatic rotation
```

### Manual Key Rotation (Recommended for ECC keys)

1. **Create new KMS key**:
   ```bash
   aws kms create-key --key-spec ECC_SECG_P256K1 --key-usage SIGN_VERIFY
   ```

2. **Derive new Ethereum address**:
   ```bash
   npm run kms:derive-address arn:aws:kms:us-east-1:123456789012:key/NEW-KEY-ID
   ```

3. **Transfer funds** from old address to new address

4. **Update alias to point to new key**:
   ```bash
   aws kms update-alias \
     --alias-name alias/stablecoin-gateway-production-wallet \
     --target-key-id NEW-KEY-ID
   ```

5. **Zero-downtime deployment**:
   - Deploy with new KMS_KEY_ID
   - Monitor for 24 hours
   - Schedule deletion of old key (minimum 7-day waiting period)

```bash
aws kms schedule-key-deletion \
  --key-id OLD-KEY-ID \
  --pending-window-in-days 30
```

## Monitoring

### CloudWatch Alarms

```bash
# Create alarm for unusual KMS activity
aws cloudwatch put-metric-alarm \
  --alarm-name stablecoin-gateway-kms-high-usage \
  --alarm-description "Alert on high KMS signing operations" \
  --metric-name SignCount \
  --namespace AWS/KMS \
  --statistic Sum \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=KeyId,Value=12345678-1234-1234-1234-123456789012
```

### View KMS Metrics

```bash
# View signing operations
aws cloudwatch get-metric-statistics \
  --namespace AWS/KMS \
  --metric-name SignCount \
  --dimensions Name=KeyId,Value=12345678-1234-1234-1234-123456789012 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## Troubleshooting

### Error: "AccessDeniedException"

**Cause**: Insufficient IAM permissions

**Solution**:
```bash
# Verify your IAM identity
aws sts get-caller-identity

# Check key policy
aws kms get-key-policy --key-id YOUR_KEY_ID --policy-name default

# Verify IAM permissions
aws iam get-user-policy --user-name YOUR_USER --policy-name YOUR_POLICY
```

### Error: "InvalidKeyUsageException"

**Cause**: Wrong key spec (not ECC_SECG_P256K1)

**Solution**: Create a new key with correct spec:
```bash
aws kms create-key --key-spec ECC_SECG_P256K1 --key-usage SIGN_VERIFY
```

### Error: "KMS connection failed"

**Cause**: Network connectivity or region mismatch

**Solution**:
```bash
# Test KMS connectivity
aws kms list-keys --region us-east-1

# Verify region matches
echo $AWS_REGION
```

### Error: "Insufficient funds" during transaction

**Cause**: Derived address not funded with gas tokens

**Solution**: Send MATIC/ETH to the derived address and wait for confirmation

### KMS Signing Timeout

**Cause**: Network latency or KMS throttling

**Solution**:
```bash
# Increase timeout in environment variables
export KMS_TIMEOUT="60000"  # 60 seconds

# Check for throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/KMS \
  --metric-name ThrottleCount \
  --dimensions Name=KeyId,Value=YOUR_KEY_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## Security Best Practices

1. **Least Privilege**: Grant only `kms:Sign` and `kms:GetPublicKey` permissions
2. **Multi-Region Keys**: Use for disaster recovery
3. **CloudTrail**: Enable logging for all KMS operations
4. **Alerts**: Set up CloudWatch alarms for unusual activity
5. **Key Rotation**: Rotate keys annually
6. **Access Review**: Regularly audit who has access to the key
7. **Deletion Protection**: Use 30-day waiting period for key deletion

## Cost Considerations

AWS KMS pricing (as of 2026):
- **Key storage**: $1/month per key
- **Signing operations**: $0.03 per 10,000 requests
- **CloudTrail logs**: S3 storage costs

For a typical payment gateway processing 10,000 transactions/day:
- Monthly KMS cost: ~$10-15
- Significantly cheaper than hardware HSMs ($10,000+)

## References

- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/)
- [Ethereum Key Management](https://aws.amazon.com/blogs/database/how-to-sign-ethereum-eip-1559-transactions-using-aws-kms/)
- [AWS KMS Best Practices](https://docs.aws.amazon.com/kms/latest/developerguide/best-practices.html)

---

**Last Updated**: 2026-01-28
**Version**: 1.0.0
