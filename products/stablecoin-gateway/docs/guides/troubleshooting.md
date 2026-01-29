# Troubleshooting Guide

Common issues and solutions when integrating Stablecoin Gateway.

## Quick Diagnosis

| Symptom | Likely Cause | Quick Fix |
|---------|-------------|-----------|
| "Payment session not found" | Expired link or wrong ID | Create new payment |
| "Invalid API key" | Wrong key or test/live mismatch | Check API key |
| "Insufficient balance" | Not enough USDC in wallet | Add funds to wallet |
| "Wrong network" | Wallet on different chain | Switch network in MetaMask |
| "Transaction failed" | Gas too low or contract error | Increase gas, retry |
| "Webhook not received" | Signature failure or timeout | Check signature verification |
| "Payment stuck confirming" | Blockchain congestion | Wait 5-10 minutes |

---

## Payment Creation Issues

### Error: "Invalid API key"

**Error Response**:
```json
{
  "type": "https://gateway.io/errors/authentication-error",
  "title": "Authentication Failed",
  "status": 401,
  "detail": "Invalid API key provided",
  "request_id": "req_abc123"
}
```

**Causes**:
1. Using test key in production (or vice versa)
2. API key revoked or expired
3. Typo in API key
4. Missing `Bearer` prefix in Authorization header

**Solutions**:

```typescript
// ✅ Correct
const headers = {
  'Authorization': `Bearer ${apiKey}`, // Include "Bearer "
};

// ❌ Incorrect
const headers = {
  'Authorization': apiKey, // Missing "Bearer"
};
```

**Verify API key**:
1. Go to [Dashboard → API Keys](https://gateway.io/dashboard/api-keys)
2. Check key status (active/revoked)
3. Verify environment (test vs live)
4. Copy key again if unsure

---

### Error: "Invalid merchant address"

**Error Response**:
```json
{
  "type": "https://gateway.io/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Invalid Ethereum wallet address",
  "field": "merchant_address"
}
```

**Causes**:
1. Address not a valid Ethereum address
2. Address missing `0x` prefix
3. Address wrong length (not 42 characters)
4. Address has invalid checksum

**Solutions**:

```typescript
// ✅ Valid Ethereum address
merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'

// ❌ Invalid - missing 0x prefix
merchant_address: '742d35Cc6634C0532925a3b844Bc9e7595f0bEb'

// ❌ Invalid - too short
merchant_address: '0x742d35Cc'

// Validate address
import { ethers } from 'ethers';

function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

if (!isValidAddress(merchantAddress)) {
  throw new Error('Invalid merchant address');
}
```

---

### Error: "Rate limit exceeded"

**Error Response**:
```json
{
  "type": "https://gateway.io/errors/rate-limit-error",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Too many requests. Limit: 100/minute",
  "retry_after": 42
}
```

**Causes**:
- Making > 100 requests/minute
- Burst of requests in short time
- Multiple API keys from same account

**Solutions**:

1. **Implement rate limiting on your side**:

```typescript
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 100, // 100ms between requests = max 600/min
});

const createPayment = limiter.wrap(async (data) => {
  return await gateway.createPaymentSession(data);
});
```

2. **Use retry with exponential backoff**:

```typescript
async function createPaymentWithRetry(data, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await gateway.createPaymentSession(data);
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

3. **Check rate limit headers**:

```typescript
const response = await fetch('https://api.gateway.io/v1/payment-sessions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify(data),
});

console.log('Rate limit:', response.headers.get('X-RateLimit-Limit'));
console.log('Remaining:', response.headers.get('X-RateLimit-Remaining'));
console.log('Reset:', response.headers.get('X-RateLimit-Reset'));
```

---

## Checkout Issues

### "Payment session not found" or expired

**Page shows**: "This payment link has expired or does not exist"

**Causes**:
1. Payment session expired (> 7 days old)
2. Wrong payment ID in URL
3. Payment session deleted

**Solutions**:

1. **Check expiration**:

```typescript
const payment = await gateway.getPaymentSession(paymentId);

if (new Date(payment.expires_at) < new Date()) {
  console.log('Payment expired. Create new one.');
  // Create new payment session
}
```

2. **Set custom expiration**:

```typescript
const payment = await gateway.createPaymentSession({
  amount: 100,
  // ... other fields
  expires_in: 3600, // Expires in 1 hour (seconds)
});
```

3. **Generate new link**:
- Don't reuse old payment IDs
- Create fresh payment session for each customer

---

### MetaMask not connecting

**Symptoms**:
- "Connect Wallet" button doesn't work
- MetaMask doesn't open
- Connection fails silently

**Causes**:
1. MetaMask not installed
2. Browser blocking popups
3. MetaMask locked
4. Multiple wallets installed (conflict)

**Solutions**:

1. **Check MetaMask installed**:

```typescript
if (typeof window.ethereum === 'undefined') {
  alert('Please install MetaMask to continue');
  window.open('https://metamask.io/download/', '_blank');
  return;
}
```

2. **Handle locked wallet**:

```typescript
try {
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts'
  });
} catch (error) {
  if (error.code === 4001) {
    alert('Please unlock MetaMask and try again');
  }
}
```

3. **Detect multiple wallets**:

```typescript
if (window.ethereum.providers && window.ethereum.providers.length > 1) {
  console.warn('Multiple wallets detected. Choosing MetaMask...');
  window.ethereum = window.ethereum.providers.find(
    provider => provider.isMetaMask
  );
}
```

4. **Allow popups**:
- Check browser settings
- Disable popup blockers
- Test in incognito mode

---

### Wrong network error

**Checkout shows**: "Please switch to Polygon network"

**Causes**:
- Wallet connected to wrong network
- Payment requires specific network
- Network not added to MetaMask

**Solutions**:

1. **Auto-switch network**:

```typescript
async function switchToPolygon() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }], // Polygon mainnet
    });
  } catch (error) {
    if (error.code === 4902) {
      // Network not added, add it
      await addPolygonNetwork();
    }
  }
}

async function addPolygonNetwork() {
  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: '0x89',
      chainName: 'Polygon Mainnet',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      rpcUrls: ['https://polygon-rpc.com'],
      blockExplorerUrls: ['https://polygonscan.com'],
    }],
  });
}
```

2. **Detect current network**:

```typescript
const chainId = await window.ethereum.request({ method: 'eth_chainId' });
console.log('Current network:', chainId);
// 0x89 = Polygon
// 0x1 = Ethereum
// 0x13881 = Mumbai (testnet)

if (chainId !== '0x89') {
  alert('Please switch to Polygon network');
}
```

---

### Insufficient balance error

**Checkout shows**: "Insufficient USDC balance"

**Causes**:
- Wallet doesn't have enough USDC
- Has USDC but on wrong network
- Balance check failed

**Solutions**:

1. **Check balance before payment**:

```typescript
import { ethers } from 'ethers';

async function checkBalance(walletAddress: string, amount: number) {
  const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
  const usdcContract = new ethers.Contract(
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );

  const balance = await usdcContract.balanceOf(walletAddress);
  const balanceUSDC = parseFloat(ethers.formatUnits(balance, 6));

  if (balanceUSDC < amount) {
    throw new Error(`Insufficient balance: ${balanceUSDC} USDC (need ${amount})`);
  }

  return balanceUSDC;
}
```

2. **Show balance in UI**:

```typescript
const balance = await checkBalance(walletAddress, 100);
console.log(`Balance: ${balance} USDC`);
```

3. **Suggest solutions**:
- Link to exchange to buy USDC
- Show faucet link (testnet)
- Offer alternative payment method

---

### Transaction failed

**MetaMask shows**: "Transaction failed" or "Reverted"

**Causes**:
1. Insufficient gas (MATIC)
2. Gas price too low
3. Token approval needed
4. Smart contract error

**Solutions**:

1. **Check gas balance**:

```typescript
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
const balance = await provider.getBalance(walletAddress);
const balanceMATIC = ethers.formatEther(balance);

if (parseFloat(balanceMATIC) < 0.01) {
  alert('Insufficient MATIC for gas. Please add at least 0.01 MATIC.');
}
```

2. **Increase gas limit**:

```typescript
const tx = await usdcContract.transfer(toAddress, amount, {
  gasLimit: 100000, // Increase if needed
});
```

3. **Check token approval**:

Some tokens require approval before transfer:

```typescript
// Check current allowance
const allowance = await usdcContract.allowance(
  walletAddress,
  gatewayAddress
);

if (allowance < amount) {
  // Approve token spending
  const approveTx = await usdcContract.approve(
    gatewayAddress,
    ethers.MaxUint256
  );
  await approveTx.wait();
}
```

4. **View transaction on explorer**:

```
https://polygonscan.com/tx/0xabc123...
```

Check "Logs" and "Internal Transactions" for error details.

---

## Webhook Issues

### Webhooks not received

**Symptoms**:
- Payment completes but webhook not received
- No entries in webhook dashboard

**Causes**:
1. Webhook URL not accessible (firewall)
2. Endpoint returning errors
3. HTTPS required in production
4. Slow response (> 10s timeout)

**Solutions**:

1. **Test webhook endpoint manually**:

```bash
curl -X POST https://yourserver.com/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test" \
  -H "X-Webhook-Timestamp: $(date +%s)" \
  -d '{"id":"evt_test","type":"payment.completed","data":{}}'
```

2. **Check webhook logs** in dashboard:
- Go to [Dashboard → Webhooks → Deliveries](https://gateway.io/dashboard/webhooks)
- See delivery attempts and responses
- Check error messages

3. **Use ngrok for local testing**:

```bash
ngrok http 3000
# Use https://abc123.ngrok.io/webhooks in webhook config
```

4. **Whitelist Gateway IPs**:

If behind firewall, allow these IPs:
```
54.123.45.67
54.123.45.68
54.123.45.69
```

See [Dashboard → Webhooks → IP Whitelist](https://gateway.io/dashboard/webhooks) for full list.

---

### "Invalid webhook signature" error

**Symptoms**:
- Webhooks received but signature verification fails
- Returning 401 to Gateway

**Causes**:
1. Using parsed JSON instead of raw body
2. Wrong webhook secret
3. Timestamp check too strict
4. Body modified by middleware

**Solutions**:

1. **Use raw body**:

```typescript
// ✅ Correct - raw body
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.post('/webhooks', (req, res) => {
  const rawBody = req.body.toString('utf-8');
  const signature = req.headers['x-webhook-signature'];
  // Verify signature with rawBody
});

// ❌ Incorrect - body already parsed
app.use(express.json());
app.post('/webhooks', (req, res) => {
  const signature = verifySignature(req.body, ...); // Won't work!
});
```

2. **Check webhook secret**:

```typescript
// Get from Dashboard → Webhooks → Your Webhook → Secret
const webhookSecret = 'whsec_abc123...'; // Must match exactly

// Verify it's correct by testing
const testPayload = 'test';
const testSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(testPayload)
  .digest('hex');
console.log('Test signature:', testSignature);
```

3. **Relax timestamp check** (for testing):

```typescript
// Strict (production)
if (Math.abs(currentTime - webhookTime) > 300) { // 5 minutes
  return false;
}

// Relaxed (testing)
if (Math.abs(currentTime - webhookTime) > 3600) { // 1 hour
  return false;
}
```

4. **Log signature verification details**:

```typescript
console.log('Raw body:', rawBody);
console.log('Signature:', signature);
console.log('Timestamp:', timestamp);
console.log('Expected signature:', expectedSignature);
console.log('Match:', signature === expectedSignature);
```

---

### Webhook timeout error

**Dashboard shows**: "Timeout after 10 seconds"

**Causes**:
- Endpoint processing takes > 10 seconds
- Database query too slow
- External API calls in webhook handler

**Solutions**:

1. **Return 200 immediately, process in background**:

```typescript
app.post('/webhooks', async (req, res) => {
  // Verify signature
  if (!verifySignature(...)) {
    return res.status(401).send();
  }

  // Return 200 immediately
  res.status(200).json({ received: true });

  // Process in background (don't await)
  processWebhookAsync(event).catch(console.error);
});

async function processWebhookAsync(event: any) {
  // Long-running operations here
  await updateDatabase(event);
  await sendEmail(event);
  await notifySlack(event);
}
```

2. **Use job queue**:

```typescript
import { Queue } from 'bullmq';

const webhookQueue = new Queue('webhooks');

app.post('/webhooks', async (req, res) => {
  if (!verifySignature(...)) {
    return res.status(401).send();
  }

  // Add to queue
  await webhookQueue.add('process', { event });

  res.status(200).json({ received: true });
});

// Worker processes jobs asynchronously
const worker = new Worker('webhooks', async (job) => {
  await processWebhook(job.data.event);
});
```

---

## Payment Status Issues

### Payment stuck in "confirming"

**Symptoms**:
- Status shows "confirming" for > 10 minutes
- Transaction visible on explorer
- No errors shown

**Causes**:
1. Blockchain congestion (high gas prices)
2. Transaction pending in mempool
3. Insufficient gas price
4. Network issues

**Solutions**:

1. **Check transaction on explorer**:

```
https://polygonscan.com/tx/0xabc123...
```

Look for:
- Status: Success/Pending/Failed
- Confirmations: Should be 64+ (Polygon)
- Gas used: Should be complete

2. **Wait longer** (blockchain-dependent):
- Polygon: Usually 2-5 minutes
- Ethereum: Usually 30-60 seconds
- During congestion: 10-30 minutes

3. **Speed up transaction** (if stuck):

In MetaMask:
- Go to Activity
- Click pending transaction
- Click "Speed Up"
- Increase gas price
- Confirm

4. **Check blockchain status**:
- [Polygon Status](https://status.polygon.technology/)
- [Etherscan Gas Tracker](https://etherscan.io/gastracker)

---

### Payment shows "completed" but funds not received

**Symptoms**:
- Dashboard shows "completed"
- Transaction confirmed on explorer
- Funds not in merchant wallet

**Causes**:
1. Wrong merchant address
2. Different network (Mumbai vs Polygon)
3. Looking at wrong token (USDC vs USDT)
4. Wallet app not showing updated balance

**Solutions**:

1. **Verify transaction on explorer**:

```
https://polygonscan.com/tx/0xabc123...
```

Check:
- **To**: Should be merchant wallet address
- **Token**: Should be USDC or USDT
- **Amount**: Should match payment amount

2. **Check token balance directly**:

```typescript
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
const usdcContract = new ethers.Contract(
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  ['function balanceOf(address) view returns (uint256)'],
  provider
);

const balance = await usdcContract.balanceOf(merchantAddress);
console.log('USDC Balance:', ethers.formatUnits(balance, 6));
```

3. **Add token to wallet**:

In MetaMask:
- Click "Import tokens"
- Enter token contract address:
  - USDC Polygon: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
  - USDT Polygon: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`
- Click "Add"

4. **Check correct network**:
- Switch wallet to correct network
- Polygon mainnet (not Mumbai testnet)

---

## API Issues

### "Internal server error" (500)

**Error Response**:
```json
{
  "type": "https://gateway.io/errors/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred",
  "request_id": "req_abc123"
}
```

**Solutions**:

1. **Retry with exponential backoff**:

```typescript
async function retryRequest(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status >= 500 && i < retries - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
        continue;
      }
      throw error;
    }
  }
}
```

2. **Check status page**:
- https://status.gateway.io
- See if there's an ongoing incident

3. **Contact support**:
- Email: support@gateway.io
- Include `request_id` from error response
- Describe what you were trying to do

---

## Getting Help

### Before Contacting Support

1. ✅ Check this troubleshooting guide
2. ✅ Check [Status Page](https://status.gateway.io)
3. ✅ Check [API Documentation](../api-contract.yml)
4. ✅ Search [Community Forum](https://community.gateway.io)
5. ✅ Try in sandbox environment first

### When Contacting Support

Include:

- **Request ID**: From error response (`request_id: req_abc123`)
- **Payment ID**: If payment-related (`ps_abc123`)
- **Transaction Hash**: If blockchain-related (`0xabc123...`)
- **API Key Prefix**: First few characters (`sk_live_abc...`)
- **Timestamp**: When error occurred
- **Steps to Reproduce**: What you were doing
- **Code Snippet**: Relevant code (remove API keys!)

### Support Channels

- **Email**: support@gateway.io (24-48 hour response)
- **Community**: https://community.gateway.io (peer support)
- **Status**: https://status.gateway.io (incidents)
- **Documentation**: https://docs.gateway.io

---

**Last Updated**: 2026-01-27
