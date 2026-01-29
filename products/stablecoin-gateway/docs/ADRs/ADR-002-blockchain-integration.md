# ADR-002: Blockchain Integration Strategy

## Status
Accepted

## Context

Stablecoin Gateway needs to interact with blockchain networks to:
1. Monitor customer payments (USDC/USDT transfers)
2. Confirm transactions (wait for N block confirmations)
3. Process refunds (send stablecoins back to customers)

Key decisions needed:
- **Which blockchain networks?** (Ethereum, Polygon, others?)
- **Which node provider?** (Alchemy, Infura, QuickNode, self-hosted?)
- **Which Web3 library?** (ethers.js, web3.js, viem?)
- **How to handle gas fees?** (Who pays? How much reserve?)
- **Confirmation strategy?** (How many blocks before "confirmed"?)

### Requirements from PRD
- NFR-014: Handle blockchain re-orgs gracefully
- NFR-017: Support 1,000 concurrent payment sessions
- NFR-031: Alert on blockchain node connection failures
- FR-013: Support Ethereum mainnet and Polygon networks
- FR-015: Mark payment complete after 3 block confirmations (Ethereum) or 64 (Polygon)

### Constraints
- **Gas fees**: Ethereum averages $5-$50/tx, Polygon $0.01-$0.50/tx
- **Block times**: Ethereum ~12s/block, Polygon ~2s/block
- **Cost budget**: 0.5% transaction fee margin means minimal operational costs
- **Reliability**: 99.9% uptime requires multiple node providers

---

## Decision

### 1. Blockchain Networks: **Polygon as Primary, Ethereum as Secondary**

**Rationale**:
- **Polygon** is the default for all payments:
  - Gas fees: $0.01-$0.50 (affordable for any payment size)
  - Fast finality: ~128 seconds (64 blocks × 2s)
  - Widely supported by wallets (MetaMask, WalletConnect)
  - USDC/USDT have deep liquidity on Polygon

- **Ethereum** available for large payments (>$500):
  - Gas fees: $5-$50 (only viable for larger amounts)
  - Faster confirmation: ~36 seconds (3 blocks × 12s)
  - Higher trust (mainnet vs. L2)
  - Preferred by some institutional users

**Implementation**:
- Checkout page detects wallet network and suggests Polygon if on Ethereum
- API accepts `network` parameter: `polygon` (default) or `ethereum`
- Separate monitoring workers for each network

---

### 2. Node Provider: **Alchemy as Primary, Infura as Fallback, QuickNode as Tertiary**

**Rationale**:

| Provider | Pros | Cons | Free Tier | Paid Tier |
|----------|------|------|-----------|-----------|
| **Alchemy** | Fast, reliable, generous free tier (300M CU/month), excellent API docs, WebSocket support | Owned by Ethereum Foundation (bias) | 300M CU/month | $199/month (Growth) |
| **Infura** | Battle-tested, used by MetaMask, wide network support | More expensive, slower than Alchemy | 100k requests/day | $225/month (Developer) |
| **QuickNode** | High performance, low latency, global endpoints | No free tier, expensive | $0 | $49/month (Discover) |

**Decision**:
- **Primary**: Alchemy (free tier covers MVP, excellent performance)
- **Fallback**: Infura (backup if Alchemy has issues)
- **Tertiary**: QuickNode (high-performance backup for peak traffic)

**Cost Analysis**:
- MVP (1,000 payments/day):
  - Alchemy free tier: sufficient (300M CU = ~3M requests)
  - Cost: $0/month
- Scale (100,000 payments/day):
  - Alchemy Growth plan: $199/month
  - Infura Developer plan: $225/month (backup)
  - Total: ~$424/month

**Failover Strategy**:
```typescript
const providers = [
  new AlchemyProvider('polygon', ALCHEMY_API_KEY),     // Primary
  new InfuraProvider('polygon', INFURA_PROJECT_ID),    // Fallback
  new JsonRpcProvider(QUICKNODE_ENDPOINT),             // Tertiary
];

async function getProvider(): Promise<Provider> {
  for (const provider of providers) {
    try {
      await provider.getBlockNumber(); // Health check
      return provider;
    } catch (error) {
      logger.warn(`Provider failed, trying next`, { provider, error });
    }
  }
  throw new Error('All blockchain providers unavailable');
}
```

---

### 3. Web3 Library: **ethers.js v6**

**Rationale**:

| Library | Pros | Cons | Bundle Size | TypeScript Support |
|---------|------|------|-------------|-------------------|
| **ethers.js** | Industry standard, excellent docs, active maintenance, TypeScript-first | Larger bundle (116KB) | 116KB | Excellent |
| **web3.js** | Long history, used by many dApps | Outdated API, poor TypeScript support | 140KB | Poor |
| **viem** | Modern, lightweight, tree-shakeable | New (less battle-tested), smaller ecosystem | 30KB | Excellent |

**Decision**: ethers.js v6
- **Maturity**: Battle-tested, used by major projects (Uniswap, OpenSea)
- **Developer Experience**: Best documentation in the space
- **TypeScript**: First-class TypeScript support (critical for payment logic)
- **Community**: Largest ecosystem, easy to find examples/help
- **Trade-off**: Larger bundle size, but only loaded on checkout page (acceptable)

**Alternative Considered**: viem
- **Why not**: Too new (v1.0 released Aug 2023), smaller community, higher risk for production
- **Future**: Re-evaluate viem in 6-12 months if it proves stable

---

### 4. Confirmation Strategy

**Ethereum**:
- **Confirmations**: 3 blocks
- **Time**: ~36 seconds (3 × 12s)
- **Rationale**: Standard in industry (Coinbase uses 3), balances speed vs. re-org risk

**Polygon**:
- **Confirmations**: 64 blocks
- **Time**: ~128 seconds (64 × 2s)
- **Rationale**: Polygon's documented recommendation for finality, prevents re-org issues

**Re-org Handling**:
```typescript
interface TransactionMonitor {
  txHash: string;
  network: 'ethereum' | 'polygon';
  blockNumber: number;
  blockHash: string;
  confirmations: number;
}

async function monitorTransaction(monitor: TransactionMonitor) {
  const receipt = await provider.getTransactionReceipt(monitor.txHash);
  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - receipt.blockNumber;

  // Check for re-org: block hash changed
  const block = await provider.getBlock(receipt.blockNumber);
  if (block.hash !== monitor.blockHash) {
    logger.warn('Re-org detected, resetting confirmations', { txHash: monitor.txHash });
    monitor.blockNumber = receipt.blockNumber;
    monitor.blockHash = block.hash;
    monitor.confirmations = 0;
  }

  monitor.confirmations = confirmations;

  const threshold = monitor.network === 'ethereum' ? 3 : 64;
  if (confirmations >= threshold) {
    return 'confirmed';
  } else {
    return 'pending';
  }
}
```

---

### 5. Gas Fee Management

**For Customer Payments** (customer sends USDC to merchant):
- Customer pays gas fees (standard wallet behavior)
- Frontend estimates gas cost before transaction using `estimateGas()`
- Display: "Estimated gas: $0.05 on Polygon" or "~$12 on Ethereum"
- No action required from our side

**For Refunds** (we send USDC back to customer):
- We pay gas fees from hot wallet
- Use EIP-1559 (base fee + priority fee) for faster inclusion
- Monitor gas prices via EthGasStation or Blocknative API
- **Safety**: If gas price > $50, pause refunds and alert team

**Hot Wallet Management**:
- Separate wallet for refunds (not merchant funds)
- Keep balance of ~$1,000 USDC + $500 ETH/MATIC for gas
- Auto-alert when balance < $500
- Multi-sig requirement for withdrawals > $5,000 (future Phase 2)

**Gas Price Strategy**:
```typescript
async function getOptimalGasPrice(network: 'ethereum' | 'polygon'): Promise<GasPrice> {
  const feeData = await provider.getFeeData();

  if (network === 'polygon') {
    // Polygon: use standard priority fee (fast confirmation)
    return {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: ethers.parseUnits('50', 'gwei'), // ~$0.10
    };
  } else {
    // Ethereum: use medium priority fee (balance cost vs speed)
    return {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'), // ~$5-10
    };
  }
}
```

---

### 6. Smart Contract Addresses

**USDC Contracts**:
- Ethereum: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Polygon: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

**USDT Contracts**:
- Ethereum: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- Polygon: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`

**Verification**:
- All contracts are verified on Etherscan/Polygonscan
- Audited by Circle (USDC) and Tether (USDT)
- No custom contracts used (reduces risk)

---

### 7. Transaction Monitoring Architecture

```typescript
// apps/api/src/workers/blockchain-monitor.ts

import { Job, Queue, Worker } from 'bullmq';
import { ethers } from 'ethers';

interface MonitorTransactionJob {
  paymentSessionId: string;
  txHash: string;
  network: 'ethereum' | 'polygon';
  customerAddress: string;
  merchantAddress: string;
  expectedAmount: string; // in USDC/USDT wei (6 decimals)
}

const queue = new Queue('blockchain-monitor', { connection: redis });

const worker = new Worker('blockchain-monitor', async (job: Job<MonitorTransactionJob>) => {
  const { txHash, network, expectedAmount, merchantAddress } = job.data;
  const provider = await getProvider(network);

  // 1. Get transaction receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    throw new Error('Transaction not found'); // Retry later
  }

  // 2. Check confirmations
  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - receipt.blockNumber;
  const threshold = network === 'ethereum' ? 3 : 64;

  if (confirmations < threshold) {
    throw new Error(`Only ${confirmations}/${threshold} confirmations`); // Retry later
  }

  // 3. Verify transaction succeeded
  if (receipt.status !== 1) {
    await updatePaymentStatus(job.data.paymentSessionId, 'failed', { reason: 'Transaction reverted' });
    return;
  }

  // 4. Parse transfer event from logs (verify amount and recipient)
  const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)']);
  const transferLog = receipt.logs.find(log => {
    try {
      const parsed = iface.parseLog(log);
      return parsed.name === 'Transfer' && parsed.args.to === merchantAddress;
    } catch {
      return false;
    }
  });

  if (!transferLog) {
    await updatePaymentStatus(job.data.paymentSessionId, 'failed', { reason: 'No transfer event found' });
    return;
  }

  const parsed = iface.parseLog(transferLog);
  const actualAmount = parsed.args.value.toString();

  if (actualAmount !== expectedAmount) {
    await updatePaymentStatus(job.data.paymentSessionId, 'failed', {
      reason: 'Amount mismatch',
      expected: expectedAmount,
      actual: actualAmount,
    });
    return;
  }

  // 5. Payment verified! Mark as completed
  await updatePaymentStatus(job.data.paymentSessionId, 'completed', {
    txHash,
    confirmations,
    blockNumber: receipt.blockNumber,
  });

  // 6. Trigger webhook and email notifications
  await triggerWebhook(job.data.paymentSessionId, 'payment.completed');
  await sendEmailNotification(job.data.paymentSessionId);

}, { connection: redis, concurrency: 50 });

// Poll every 5 seconds until confirmed
export async function startMonitoring(data: MonitorTransactionJob) {
  await queue.add('monitor', data, {
    attempts: 100, // Retry up to 100 times
    backoff: {
      type: 'fixed',
      delay: 5000, // 5 seconds between retries
    },
  });
}
```

---

## Consequences

### Positive
1. **Cost Efficiency**: Polygon reduces gas fees by 99%, aligns with 0.5% fee margin
2. **Reliability**: Multi-provider failover ensures 99.9% uptime
3. **Security**: Confirmed transactions prevent double-spend attacks
4. **Developer Experience**: ethers.js has excellent documentation and community support
5. **Scalability**: Alchemy's infrastructure can handle 100k+ payments/day

### Negative
1. **Polygon Dependency**: If Polygon network fails, payments halt (mitigation: Ethereum fallback)
2. **Gas Fee Volatility**: Ethereum refunds may become expensive during congestion (mitigation: pause refunds if gas > $50)
3. **Re-org Risk**: Rare but possible, especially on Polygon (mitigation: wait 64 blocks)
4. **Provider Lock-in**: Heavy reliance on Alchemy (mitigation: maintain Infura/QuickNode as backups)
5. **Bundle Size**: ethers.js adds 116KB to frontend (mitigation: load only on checkout page)

### Neutral
1. **Confirmation Wait Time**: Customers wait 36-128 seconds for confirmation (acceptable for crypto)
2. **Hot Wallet Security**: Need to manage private keys securely (standard for crypto apps)

---

## Alternatives Considered

### Alternative 1: Self-Hosted Blockchain Nodes

**Pros**:
- No API rate limits or costs
- Full control over infrastructure

**Cons**:
- High operational cost (2+ VPS instances, 2TB+ storage)
- Maintenance burden (software updates, disk space management)
- Slower sync times during issues
- Estimated cost: $300-500/month vs. Alchemy's $0-199/month

**Why Rejected**: Alchemy free tier covers MVP, and Growth plan is cheaper than self-hosting until very high scale

---

### Alternative 2: Use Only Ethereum (No Polygon)

**Pros**:
- Simpler architecture (one network)
- Faster confirmation (3 blocks vs. 64)

**Cons**:
- Gas fees $5-$50 make small payments ($10-$100) uneconomical
- Merchant receives less (gas eats into payment amount)
- Poor user experience for small transactions

**Why Rejected**: Polygon's low fees are critical for small-to-medium payments

---

### Alternative 3: Use web3.js Instead of ethers.js

**Pros**:
- Older library, more examples online

**Cons**:
- Poor TypeScript support (lots of `any` types)
- Outdated API design
- Slower development (less frequent updates)

**Why Rejected**: ethers.js is the modern standard, better DX, safer for payment logic

---

### Alternative 4: Use viem Instead of ethers.js

**Pros**:
- Much smaller bundle (30KB vs. 116KB)
- Modern API, tree-shakeable
- Excellent TypeScript support

**Cons**:
- Too new (v1.0 in Aug 2023), only 12 months old
- Smaller ecosystem, fewer examples
- Higher risk for production payment system

**Why Rejected**: Too risky for MVP. Will re-evaluate in 6-12 months if viem proves stable.

---

## References

- [Alchemy Documentation](https://docs.alchemy.com/)
- [Infura Documentation](https://docs.infura.io/)
- [ethers.js Documentation](https://docs.ethers.org/v6/)
- [Polygon Finality Recommendations](https://wiki.polygon.technology/docs/pos/concepts/transaction-finality/)
- [EIP-1559 Gas Fee Mechanism](https://eips.ethereum.org/EIPS/eip-1559)
- [USDC Contract Addresses](https://www.circle.com/en/usdc-multichain)
- [USDT Contract Addresses](https://tether.to/en/transparency/)

---

**Date**: 2026-01-27
**Author**: Claude Architect
**Reviewers**: CEO (pending)
**Status**: Accepted
