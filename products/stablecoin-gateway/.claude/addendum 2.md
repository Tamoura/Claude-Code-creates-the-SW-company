# Stablecoin Gateway - Agent Addendum

## Product Overview

**Name**: Stablecoin Gateway
**Type**: Web App (Prototype - Frontend Only)
**Status**: Prototype Phase
**Time Budget**: 2-4 hours total

## Prototype Scope

This is a **rapid validation prototype**, not a production product. Focus:
- Frontend only (no backend)
- Mock wallet interactions
- Fake blockchain data
- localStorage for state
- Simple, clean UX

## Tech Stack (Prototype)

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Build Tool | Vite | 5.x | Instant HMR, zero config |
| Frontend | React | 18.x | Component-based UI |
| Language | TypeScript | 5.x | Type safety for payments state |
| Routing | React Router | 6.x | Client-side routing (3 pages) |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| UI Components | shadcn/ui | Latest | Button, Card, Input, Badge |
| Forms | React Hook Form | 7.x | Lightweight form validation |
| State | React useState + Context | Native | No global state library needed |
| Storage | localStorage | Native | Persist payments across sessions |
| Testing (Unit) | Vitest | 1.x | Fast Jest-compatible tests |
| Testing (E2E) | Playwright | 1.x | One happy path test |
| Backend | None | - | Frontend only |
| Database | None | - | localStorage only |
| Deployment | None | - | Local demo only |

### Dependencies (Minimal)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "react-hook-form": "^7.50.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.0",
    "typescript": "^5.2.2",
    "tailwindcss": "^3.4.1",
    "vitest": "^1.3.0",
    "playwright": "^1.41.0"
  }
}
```

### Bundle Budget
- **Target**: < 100KB gzipped
- **Max**: 150KB gzipped
- **Rationale**: Fast load = professional feel

## Site Map

| Route | Component | Description | State |
|-------|-----------|-------------|-------|
| / | `<HomePage />` | Landing page + payment link generator | Form state only |
| /pay/:id | `<PaymentPage />` | Customer payment page (mock wallet) | Mock wallet connection |
| /status/:id | `<StatusPage />` | Payment status tracker | Poll from localStorage |

### Component Structure
```
src/
├── pages/
│   ├── HomePage.tsx           # Payment link generator
│   ├── PaymentPage.tsx        # Mock wallet + pay button
│   └── StatusPage.tsx         # Real-time status tracker
├── components/
│   ├── PaymentForm.tsx        # Amount input + validation
│   ├── WalletMock.tsx         # Simulated MetaMask UI
│   └── StatusTracker.tsx      # Progress indicator
├── lib/
│   ├── payments.ts            # Payment CRUD (localStorage)
│   ├── wallet.ts              # Mock wallet logic
│   └── transactions.ts        # Fake blockchain simulation
└── types/
    └── payment.ts             # TypeScript interfaces
```

## Key Concepts

### Stablecoins
- USDC, USDT: Cryptocurrencies pegged to $1 USD
- Exist on blockchains (Ethereum, Polygon, etc.)
- Fast settlement, low fees, no volatility

### Payment Flow (Mocked)
```
1. Merchant creates payment link ($100)
2. Customer clicks link
3. Customer "connects wallet" (fake MetaMask)
4. Customer approves transaction (simulated)
5. Status page shows "confirming" (timer animation)
6. Status page shows "complete"
```

## Business Logic (Prototype)

### Payment Link Generation
```
- Input: Amount in USD
- Output: Unique payment ID + shareable link
- Storage: localStorage
- No expiration (prototype only)
```

### Mock Transaction
```
- Simulate 5-second blockchain confirmation
- Generate fake transaction hash
- Show success state
```

### Fee Calculation
```
- Fee: 0.5% of amount
- Display: "You pay $100, merchant receives $99.50"
```

## Validation Rules

- Amount: Minimum $1, maximum $10,000 (prototype limit)
- Payment ID: UUID v4
- Transaction Hash: Fake hex string (0x...)

## Special Considerations

### Prototype Shortcuts
- No real wallet connections (use mock UI)
- No real blockchain calls (simulate with setTimeout)
- No persistence beyond localStorage
- No error handling for edge cases
- No authentication needed

### Mock Implementations

**Mock Wallet API** (`src/lib/wallet.ts`):
```typescript
export const mockWallet = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  balance: 1000.00, // USDC
  connected: false,

  connect: async () => {
    await delay(1000); // Simulate connection
    mockWallet.connected = true;
    return mockWallet.address;
  },

  sendTransaction: async (amount: number) => {
    await delay(5000); // Simulate blockchain confirmation
    return {
      hash: '0x' + crypto.randomUUID().replace(/-/g, ''),
      status: 'success' as const,
    };
  }
};
```

**localStorage Schema** (`src/lib/payments.ts`):
```typescript
interface Payment {
  id: string;           // UUID
  amount: number;       // USD (e.g., 100.00)
  status: 'pending' | 'confirming' | 'complete';
  txHash?: string;      // Fake transaction hash
  createdAt: number;    // Unix timestamp
  completedAt?: number; // Unix timestamp
}

// CRUD operations
export const createPayment = (amount: number): Payment => {...}
export const getPayment = (id: string): Payment | null => {...}
export const updatePayment = (id: string, updates: Partial<Payment>): void => {...}
```

**Transaction Simulator** (`src/lib/transactions.ts`):
```typescript
export const simulateTransaction = async (paymentId: string, amount: number) => {
  // Update to "confirming"
  updatePayment(paymentId, { status: 'confirming' });

  // Wait 5 seconds (blockchain confirmation)
  await delay(5000);

  // Generate fake tx hash
  const txHash = '0x' + crypto.randomUUID().replace(/-/g, '');

  // Update to "complete"
  updatePayment(paymentId, {
    status: 'complete',
    txHash,
    completedAt: Date.now()
  });

  return txHash;
};
```

### What Must Feel Real
- Payment link generation UX
- Wallet connection flow
- Transaction confirmation animation
- Status page updates

### Success Metrics
- Can non-crypto CEO understand the flow?
- Can demo be completed in under 2 minutes?
- Do merchants see the value proposition?

## Visual Design

### Design System
- **Inspiration**: Stripe (clean, trustworthy, minimal)
- **Colors**:
  - Primary: Blue-600 (trust, crypto)
  - Success: Green-600 (completed)
  - Warning: Yellow-500 (confirming)
- **Typography**: System fonts (fast load)
- **Spacing**: Tailwind defaults (consistent)

### Key UI Components
- Large CTAs: `h-12 text-lg` (easy to click)
- Progress indicators: Animated spinner + timer
- Status badges: Color-coded (pending/confirming/complete)
- Copy buttons: Click to copy payment links

### Accessibility (Minimal for Prototype)
- Semantic HTML (`<button>`, `<form>`, `<main>`)
- ARIA labels for status changes
- Keyboard navigation (tab order)
- Color contrast: WCAG AA

---

## Development Notes

### Port Configuration
- Dev server: `localhost:3101` (per company standards: 3100+)
- Configure in `vite.config.ts`:
  ```typescript
  export default defineConfig({
    plugins: [react()],
    server: { port: 3101 }
  })
  ```

### Build Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3101)
npm run build        # Build for production
npm run test         # Run unit tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright)
```

### Testing Strategy (Minimal)
- **Unit**: Core logic only (payment CRUD, wallet mock)
- **E2E**: One happy path (create link → pay → status complete)
- **No**: Integration tests, edge cases, error scenarios

### Time Allocation (2 hours total)
- Setup (Vite + deps): 15 minutes
- HomePage (form + link): 30 minutes
- PaymentPage (wallet mock): 30 minutes
- StatusPage (tracker): 30 minutes
- Tests + polish: 15 minutes

---

**Created by**: Product Manager
**Last Updated by**: Architect
**Last Updated**: 2026-01-27
**Status**: Tech stack finalized, ready for Frontend Engineer
