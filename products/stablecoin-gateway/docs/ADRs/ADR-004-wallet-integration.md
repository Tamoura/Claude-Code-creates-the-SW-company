# ADR-004: Wallet Integration Strategy

## Status
Accepted

## Context

Customers need to connect their crypto wallets to pay with stablecoins. Key decisions needed:
- **Which wallets to support?** (MetaMask, WalletConnect, Coinbase Wallet?)
- **Connection method?** (Browser extension, mobile app, hardware wallet?)
- **Which Web3 library?** (ethers.js, wagmi, web3-react?)
- **User experience?** (Modal, redirect, QR code?)
- **Security?** (How to prevent phishing, wallet drain attacks?)

### Requirements from PRD
- FR-009: Customers can connect wallets via MetaMask browser extension
- FR-010: Customers can connect wallets via WalletConnect (mobile)
- FR-012: Checkout validates customer has sufficient balance before allowing payment
- NFR-001: Hosted checkout page loads in < 2 seconds (LCP)
- NFR-021: Hosted checkout page meets WCAG 2.1 Level AA

### User Personas
- **Sarah** (E-commerce owner): Non-technical, needs dead-simple wallet connection
- **David** (SaaS founder): Mobile-first user, expects WalletConnect support
- **Marcus** (Course creator): Uses MetaMask on desktop

### Constraints
- Must support both desktop (MetaMask) and mobile (WalletConnect)
- Bundle size budget: < 200KB (ethers.js is 116KB, need to optimize)
- Checkout abandonment rate target: < 20%
- No custody of user funds (non-custodial)

---

## Decision

### 1. Supported Wallets

**Phase 1 (MVP)**:
1. **MetaMask** (Browser Extension)
   - **Market Share**: 73% of crypto users (Statista 2024)
   - **Platform**: Desktop (Chrome, Firefox, Brave)
   - **Integration**: `window.ethereum` API

2. **WalletConnect v2** (Mobile Wallets)
   - **Supported Wallets**: 170+ wallets (Trust Wallet, Rainbow, Coinbase Wallet, etc.)
   - **Platform**: Mobile + Desktop
   - **Integration**: WalletConnect SDK

**Phase 2 (Future)**:
3. **Coinbase Wallet** (Browser Extension + Mobile)
4. **Ledger** (Hardware Wallet)
5. **Phantom** (Solana support, future)

**Rationale**:
- MetaMask + WalletConnect covers 90%+ of crypto users
- Two integrations are easier to maintain than 10+ individual wallets
- WalletConnect acts as universal adapter for mobile wallets

---

### 2. Web3 Library: **ethers.js v6 + wagmi (for React hooks)**

**Rationale**:

| Library | Pros | Cons | Bundle Size |
|---------|------|------|-------------|
| **ethers.js** | Industry standard, excellent docs, TypeScript-first | Large bundle (116KB) | 116KB |
| **wagmi** | React hooks, wallet auto-detection, excellent DX | Requires ethers.js (stacked bundles) | 50KB + ethers |
| **web3-react** | React-first, modular connectors | Outdated, poor docs | 80KB + web3.js |
| **ConnectKit** | Beautiful UI, all-in-one | Opinionated design, 200KB+ | 200KB+ |

**Decision**: ethers.js v6 + wagmi v2
- **ethers.js**: For blockchain interaction (transactions, contract calls)
- **wagmi**: For wallet connection hooks and React state management
- **Total Bundle**: ~166KB (acceptable, only loaded on checkout page)

**Architecture**:
```typescript
// apps/web/lib/wagmi-config.ts
import { createConfig, http } from 'wagmi';
import { polygon, mainnet } from 'wagmi/chains';
import { metaMask, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [polygon, mainnet],
  connectors: [
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
      metadata: {
        name: 'Stablecoin Gateway',
        description: 'Accept stablecoin payments',
        url: 'https://gateway.io',
        icons: ['https://gateway.io/icon.png'],
      },
    }),
  ],
  transports: {
    [polygon.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_MAINNET_URL),
  },
});
```

**React Integration**:
```typescript
// apps/web/app/checkout/[sessionId]/page.tsx
'use client';

import { useAccount, useConnect, useDisconnect, useSendTransaction } from 'wagmi';
import { parseUnits } from 'ethers';

export default function CheckoutPage({ params }: { params: { sessionId: string } }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransaction } = useSendTransaction();

  const payment = usePayment(params.sessionId); // Fetch payment details from API

  const handlePay = async () => {
    if (!address || !payment) return;

    // ERC-20 transfer: send USDC to merchant
    const tx = await sendTransaction({
      to: payment.usdcContractAddress, // USDC contract
      data: encodeTransferCall(payment.merchantAddress, parseUnits(payment.amount, 6)), // 6 decimals for USDC
      value: 0n, // No ETH sent, only USDC
    });

    // Monitor transaction in backend
    await fetch(`/api/v1/payment-sessions/${payment.id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ txHash: tx.hash }),
    });
  };

  return (
    <div>
      <h1>Pay ${payment.amount}</h1>

      {!isConnected ? (
        <div>
          <button onClick={() => connect({ connector: connectors[0] })}>
            Connect MetaMask
          </button>
          <button onClick={() => connect({ connector: connectors[1] })}>
            Connect Mobile Wallet (WalletConnect)
          </button>
        </div>
      ) : (
        <div>
          <p>Connected: {address}</p>
          <button onClick={handlePay}>Pay with USDC</button>
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

**Trade-offs**:
- **Pro**: wagmi handles wallet connection state, auto-reconnect, network switching
- **Con**: 166KB bundle size (mitigated by code splitting, only load on checkout page)

---

### 3. Connection Flow

**Desktop Flow (MetaMask)**:
```
1. Customer visits checkout page
2. Click "Connect MetaMask"
3. MetaMask popup appears (browser extension)
4. Customer approves connection
5. Wallet address displayed on checkout page
6. Click "Pay with USDC"
7. MetaMask popup appears for transaction approval
8. Customer approves transaction
9. Transaction broadcast to blockchain
10. Status page shows "Confirming..." (real-time updates)
11. After 3/64 confirmations: "Payment Complete!"
```

**Mobile Flow (WalletConnect)**:
```
1. Customer visits checkout page on mobile browser
2. Click "Connect Wallet"
3. WalletConnect QR code modal appears
4. Customer opens wallet app (Trust Wallet, Rainbow, etc.)
5. Wallet app scans QR code (or deep link on same device)
6. Customer approves connection in wallet app
7. Checkout page updates: "Connected"
8. Click "Pay with USDC"
9. Wallet app prompts transaction approval
10. Customer approves in wallet app
11. Transaction broadcast to blockchain
12. Status page shows "Confirming..."
13. Payment complete!
```

**Time to Pay** (target):
- First-time users: < 2 minutes (including wallet connection)
- Returning users: < 30 seconds (auto-reconnect)

---

### 4. Balance Validation

**Before Transaction**:
```typescript
// apps/web/hooks/useCheckBalance.ts
import { useBalance, useAccount } from 'wagmi';
import { parseUnits } from 'ethers';

export function useCheckBalance(requiredAmount: string, token: 'USDC' | 'USDT') {
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address,
    token: TOKEN_ADDRESSES[token][chain.id], // USDC/USDT contract address
  });

  const required = parseUnits(requiredAmount, 6); // USDC/USDT have 6 decimals
  const hasSufficientBalance = balance && balance.value >= required;

  return {
    balance: balance?.formatted,
    hasSufficientBalance,
    shortfall: !hasSufficientBalance ? required - (balance?.value || 0n) : 0n,
  };
}
```

**UI Implementation**:
```tsx
// apps/web/app/checkout/[sessionId]/PayButton.tsx
export function PayButton({ amount, token }: { amount: string; token: 'USDC' | 'USDT' }) {
  const { hasSufficientBalance, balance, shortfall } = useCheckBalance(amount, token);

  if (!hasSufficientBalance) {
    return (
      <div>
        <p>Insufficient {token} balance</p>
        <p>Your balance: {balance} {token}</p>
        <p>Need: {ethers.formatUnits(shortfall, 6)} {token} more</p>
        <a href="https://app.uniswap.org" target="_blank">Buy {token} on Uniswap</a>
      </div>
    );
  }

  return <button onClick={handlePay}>Pay {amount} {token}</button>;
}
```

---

### 5. Network Detection & Switching

**Problem**: Customer is on Ethereum mainnet, but payment requires Polygon

**Solution**: Auto-prompt network switch
```typescript
// apps/web/hooks/useNetworkSwitch.ts
import { useSwitchChain, useChainId } from 'wagmi';
import { polygon } from 'wagmi/chains';

export function useNetworkSwitch(requiredChainId: number) {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isCorrectNetwork = chainId === requiredChainId;

  const switchToCorrectNetwork = async () => {
    await switchChain({ chainId: requiredChainId });
  };

  return { isCorrectNetwork, switchToCorrectNetwork };
}
```

**UI Implementation**:
```tsx
// apps/web/app/checkout/[sessionId]/NetworkGuard.tsx
export function NetworkGuard({ children, requiredNetwork }: { children: React.ReactNode; requiredNetwork: 'polygon' | 'ethereum' }) {
  const { isCorrectNetwork, switchToCorrectNetwork } = useNetworkSwitch(CHAIN_IDS[requiredNetwork]);

  if (!isCorrectNetwork) {
    return (
      <div>
        <p>Wrong network detected</p>
        <p>This payment requires {requiredNetwork}</p>
        <button onClick={switchToCorrectNetwork}>Switch to {requiredNetwork}</button>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

### 6. Security Measures

**1. Phishing Prevention**:
- Display full merchant name and domain on checkout page
- Show expected payment amount before wallet prompts
- Warn users to verify URL (https://gateway.io)

**2. Transaction Verification**:
```typescript
// Verify transaction matches expected payment
const verifyTransaction = async (txHash: string, paymentId: string) => {
  const receipt = await provider.getTransactionReceipt(txHash);
  const payment = await getPayment(paymentId);

  // Verify recipient address
  const transferEvent = parseTransferEvent(receipt.logs);
  if (transferEvent.to !== payment.merchantAddress) {
    throw new Error('Transaction sent to wrong address');
  }

  // Verify amount
  if (transferEvent.value !== parseUnits(payment.amount, 6)) {
    throw new Error('Transaction amount mismatch');
  }

  // Verify token contract
  if (transferEvent.contractAddress !== USDC_ADDRESS) {
    throw new Error('Wrong token transferred');
  }
};
```

**3. Rate Limiting**:
- Limit wallet connection attempts: 10 per IP per hour
- Limit payment submissions: 5 per wallet per hour

**4. User Education**:
```tsx
// Security tips displayed on checkout
<SecurityTips>
  <Tip>✓ Verify this URL: https://gateway.io/checkout/...</Tip>
  <Tip>✓ MetaMask will show payment amount before you approve</Tip>
  <Tip>✓ Never share your private key or seed phrase</Tip>
  <Tip>✓ We will never ask for your password</Tip>
</SecurityTips>
```

---

### 7. Error Handling

**Common Errors**:

| Error | Cause | User Message | Recovery |
|-------|-------|--------------|----------|
| `UserRejectedRequest` | User rejected wallet connection | "Connection cancelled. Please try again." | Retry button |
| `ChainMismatch` | Wrong network selected | "Please switch to Polygon network" | Switch network button |
| `InsufficientFunds` | Not enough USDC | "Your balance: 50 USDC. Need: 100 USDC. Buy more?" | Link to Uniswap |
| `TransactionReverted` | Smart contract error | "Payment failed. Please try again or contact support." | Retry button |
| `Timeout` | Transaction took > 5 minutes | "Payment timed out. Please check your wallet and try again." | Retry button |

**Implementation**:
```typescript
// apps/web/hooks/usePayment.ts
import { useWalletClient } from 'wagmi';

export function usePayment(paymentId: string) {
  const { data: walletClient } = useWalletClient();

  const pay = async () => {
    try {
      const tx = await walletClient.sendTransaction({ /* ... */ });
      return { success: true, txHash: tx.hash };
    } catch (error) {
      if (error.code === 4001) {
        return { success: false, error: 'USER_REJECTED' };
      } else if (error.code === -32000) {
        return { success: false, error: 'INSUFFICIENT_FUNDS' };
      } else {
        return { success: false, error: 'UNKNOWN', details: error.message };
      }
    }
  };

  return { pay };
}
```

---

### 8. Accessibility

**Keyboard Navigation**:
- All buttons accessible via Tab key
- Enter key triggers "Connect Wallet" and "Pay" buttons
- Esc key closes wallet modal

**Screen Reader Support**:
```tsx
<button
  onClick={connect}
  aria-label="Connect your crypto wallet to make payment"
  aria-describedby="wallet-help-text"
>
  Connect Wallet
</button>
<p id="wallet-help-text" className="sr-only">
  This will open MetaMask or WalletConnect to securely connect your wallet. We cannot access your funds without your approval.
</p>
```

**Visual Indicators**:
- Focus rings on all interactive elements (WCAG 2.1 AA)
- High contrast mode support
- Loading states with spinners and text (not just spinners)

---

### 9. Mobile Optimization

**Deep Links** (WalletConnect):
- Detect mobile device → show "Open in Wallet" button instead of QR code
- Deep link format: `wc:xxx@2?relay-protocol=irn&symKey=yyy`
- Fallback to QR code if deep link fails

**Responsive Design**:
```css
/* Mobile-first design */
.checkout-container {
  padding: 1rem;
  max-width: 100%;
}

/* Desktop */
@media (min-width: 768px) {
  .checkout-container {
    max-width: 480px;
    margin: 0 auto;
  }
}
```

**Touch Targets**:
- Minimum button size: 44×44px (WCAG 2.1 AA)
- Sufficient spacing between buttons (8px minimum)

---

### 10. Performance Optimization

**Code Splitting**:
```typescript
// Only load wallet libraries on checkout page
const WalletProvider = dynamic(() => import('@/components/WalletProvider'), {
  ssr: false, // Don't SSR wallet connection (requires window.ethereum)
  loading: () => <LoadingSpinner />,
});
```

**Lazy Loading**:
```typescript
// Load WalletConnect only when user clicks "Connect Wallet"
const [showWalletConnect, setShowWalletConnect] = useState(false);

const WalletConnectModal = lazy(() => import('@walletconnect/modal-react-native'));
```

**Bundle Analysis**:
- ethers.js: 116KB (required)
- wagmi: 50KB (required)
- WalletConnect SDK: 80KB (lazy load)
- Total initial: 166KB
- Total with WalletConnect: 246KB (only if user clicks WalletConnect button)

---

## Consequences

### Positive
1. **Market Coverage**: MetaMask (73%) + WalletConnect (170+ wallets) = 95%+ users covered
2. **Developer Experience**: wagmi provides excellent React hooks, reduces boilerplate
3. **Security**: Non-custodial, no private keys stored, transaction verification
4. **Mobile Support**: WalletConnect deep links provide native app experience
5. **Accessibility**: WCAG 2.1 AA compliant, keyboard navigation, screen reader support

### Negative
1. **Bundle Size**: 166KB (ethers + wagmi) impacts initial load time (mitigated by code splitting)
2. **Complexity**: Two wallet integrations to maintain (MetaMask + WalletConnect)
3. **WalletConnect Dependency**: Requires WalletConnect Cloud (free tier: 3M requests/month)
4. **Mobile UX**: QR code scanning has friction on same-device (mitigated by deep links)

### Neutral
1. **Learning Curve**: Developers need to learn wagmi hooks (similar to React Query)
2. **Wallet Diversity**: Supporting 170+ wallets means testing challenges (mitigated by WalletConnect certification)

---

## Alternatives Considered

### Alternative 1: RainbowKit Instead of wagmi

**Pros**:
- Beautiful pre-built UI (modal, wallet list)
- Zero config, works out of the box
- Excellent branding

**Cons**:
- Opinionated design (hard to customize)
- Larger bundle (200KB+)
- Less control over UX

**Why Rejected**: We need custom checkout UX that matches Stripe's feel, not Rainbow's design

---

### Alternative 2: ConnectKit Instead of wagmi

**Pros**:
- All-in-one solution (wagmi + UI)
- Auto-detects wallets

**Cons**:
- 200KB+ bundle
- Less flexible than bare wagmi
- Relatively new (less battle-tested)

**Why Rejected**: Too opinionated, bundle too large

---

### Alternative 3: web3-react Instead of wagmi

**Pros**:
- Older, more examples online
- Modular connectors

**Cons**:
- Outdated API (v6 still in beta)
- Poor documentation
- Smaller community

**Why Rejected**: wagmi is the modern standard, better DX, actively maintained

---

### Alternative 4: Support Only MetaMask (No WalletConnect)

**Pros**:
- Simpler implementation (one wallet)
- Smaller bundle (no WalletConnect SDK)

**Cons**:
- Excludes 25%+ of users (mobile-only)
- Poor experience for Trust Wallet, Coinbase Wallet users

**Why Rejected**: Mobile support is critical for reaching broader market

---

## References

- [wagmi Documentation](https://wagmi.sh/)
- [WalletConnect Documentation](https://docs.walletconnect.com/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [EIP-1193: Ethereum Provider JavaScript API](https://eips.ethereum.org/EIPS/eip-1193)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Statista: Crypto Wallet Market Share](https://www.statista.com/statistics/1382919/crypto-wallet-market-share/)

---

**Date**: 2026-01-27
**Author**: Claude Architect
**Reviewers**: CEO (pending), Frontend Engineer (pending)
**Status**: Accepted
