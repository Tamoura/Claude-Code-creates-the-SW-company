# ADR-001: Prototype Tech Stack

## Status
Accepted

## Context

Building a 2-hour validation prototype for Stablecoin Gateway. Goal is to test merchant demand for simplified crypto payments before investing in full production system.

**Key Constraints:**
- 2-4 hour total build time
- Frontend only (no backend)
- Mock wallet interactions (no real blockchain)
- Demo quality, not production ready
- Must feel real enough to validate UX with merchants

**Success Criteria:**
- Merchant can create payment link
- Customer can "pay" via mock wallet
- Status updates in real-time
- Non-crypto CEO can demo this

## Decision

Use **Vite + React 18 + TypeScript** with minimal dependencies:

### Core Stack
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Frontend Framework | Vite 5 + React 18 | Fastest dev server, instant HMR, zero config |
| Language | TypeScript | Type safety for complex state (payments) |
| Styling | Tailwind CSS | Rapid UI development, no CSS files |
| UI Components | shadcn/ui | Professional components, copy-paste, accessible |
| Routing | React Router v6 | Simple SPA routing for 3 pages |
| State | React useState + useContext | Sufficient for prototype (localStorage backed) |
| Forms | Native + React Hook Form | Lightweight, works out of box |
| Testing | Vitest + Playwright | Fast unit tests, E2E for demo validation |

### What We're NOT Using
- ❌ Next.js: Overkill for static SPA, slower dev
- ❌ Backend framework: No server needed
- ❌ Database: localStorage sufficient
- ❌ Global state (Zustand/Redux): Only 3 pages
- ❌ Real crypto libraries (ethers.js): Mocking everything
- ❌ Authentication: No accounts needed

### Mock Strategy

**Mock Wallet (MetaMask simulation)**:
```typescript
// Mock wallet object
const mockWallet = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  balance: 1000.00, // USDC
  connect: () => setTimeout(() => setConnected(true), 1000),
  sendTransaction: (amount) => {
    // Simulate 5-second blockchain confirmation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          hash: '0x' + crypto.randomUUID().replace(/-/g, ''),
          status: 'success',
        });
      }, 5000);
    });
  }
};
```

**localStorage Schema**:
```typescript
interface Payment {
  id: string;           // UUID
  amount: number;       // USD
  status: 'pending' | 'confirming' | 'complete';
  txHash?: string;      // Fake transaction hash
  createdAt: number;    // timestamp
}

// Store in localStorage
localStorage.setItem('payments', JSON.stringify(payments));
```

### Page Structure

```
/                    # Landing + payment link generator
  └─> /pay/:id       # Customer payment page (mock wallet)
       └─> /status/:id   # Real-time status tracker
```

### Bundle Target
- **Max**: 150KB gzipped
- **Target**: < 100KB gzipped
- **Justification**: Fast load = feels professional

### Development Workflow
1. `npm create vite@latest` (React + TypeScript template)
2. Add Tailwind CSS
3. Add shadcn/ui components (Button, Card, Input)
4. Add React Router
5. Build 3 pages with mock logic
6. Add Vitest for core logic tests
7. Add 1 Playwright test for happy path

## Consequences

### Positive
- **Speed**: Can build in 2 hours with this stack
- **Familiar**: Team has used this exact stack (gpu-calculator)
- **Simple**: No backend complexity, no deployment concerns
- **Fast**: Vite HMR = instant feedback loop
- **Professional**: shadcn/ui looks production-grade

### Negative
- **Throwaway**: Will need complete rebuild if validated
- **Limited**: Can't do real blockchain interactions
- **localStorage**: Data lost on browser clear
- **No persistence**: Can't track across devices

### Neutral
- **Mock wallet**: Good enough for validation, need real MetaMask later
- **No testing**: Minimal tests acceptable for prototype

## Alternatives Considered

### Next.js 14
- **Pros**: Better for SEO, SSR, more features
- **Cons**: Slower dev server, overkill for SPA, 20% more setup time
- **Why rejected**: No SEO needed for prototype, Vite is faster

### Plain HTML/CSS/JS (no framework)
- **Pros**: Even faster to set up
- **Cons**: No component reuse, messy state management, harder to scale
- **Why rejected**: React components = faster UI iteration

### Vue 3 + Vite
- **Pros**: Similar speed to React
- **Cons**: Team less familiar, fewer UI libraries
- **Why rejected**: Stick with team expertise

## References
- Similar pattern: gpu-calculator (Vite + React, no backend)
- Company knowledge: PATTERN-001 (Vite + React + TypeScript Setup)
- Reusable Components Guide: shadcn/ui recommended
