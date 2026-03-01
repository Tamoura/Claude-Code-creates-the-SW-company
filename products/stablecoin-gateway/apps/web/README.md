# Stablecoin Gateway - Prototype

A rapid validation prototype for accepting stablecoin payments (USDC/USDT) with low fees.

## Features

1. **Payment Link Generator** - Create payment links with custom amounts
2. **Mock Wallet Connection** - Simulated MetaMask wallet experience
3. **Real-time Payment Status** - Track payment progress with blockchain simulation

## Tech Stack

- **Framework**: Vite 5 + React 18 + TypeScript 5
- **Routing**: React Router 6
- **Styling**: Tailwind CSS v4
- **Forms**: React Hook Form
- **State**: localStorage for payment persistence
- **Testing**: Vitest (unit) + Playwright (E2E)

## Quick Start

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:3101)
npm run dev

# Run tests
npm run test        # Unit tests
npm run test:e2e    # E2E tests

# Build for production
npm run build
```

## Test Coverage

- **16 unit tests** - Core business logic (payments, wallet, transactions)
- **3 E2E tests** - Complete user flows
- **Total: 19 tests** - All passing

## Bundle Size

- **85.85 KB gzipped** - Under 100KB target
- Fast load times for professional feel

## Project Structure

```
src/
├── lib/
│   ├── payments.ts        # Payment CRUD (localStorage)
│   ├── wallet.ts          # Mock wallet implementation
│   └── transactions.ts    # Blockchain simulation
├── pages/
│   ├── HomePage.tsx       # Payment link generator
│   ├── PaymentPage.tsx    # Customer payment flow
│   └── StatusPage.tsx     # Payment status tracker
└── types/
    └── payment.ts         # TypeScript interfaces
```

## Demo Flow

1. Navigate to http://localhost:3101
2. Enter amount (e.g., $100)
3. Click "Generate Payment Link"
4. Click "View Payment Page"
5. Click "Connect Wallet" (simulated 1s delay)
6. Click "Pay $100" (simulated 5s blockchain confirmation)
7. View real-time status updates
8. See completed payment

## Prototype Limitations

- Frontend only (no backend)
- localStorage only (no database)
- Mock wallet (no real MetaMask)
- Fake blockchain (simulated transactions)
- No authentication
- No real money handling

## Next Steps (If Validated)

- Integrate real blockchain (Ethereum/Polygon)
- Connect real wallets (MetaMask, WalletConnect)
- Build backend API with webhook notifications
- Add payment dashboard and analytics
- Implement proper security and error handling

## Accessibility Baseline

WCAG 2.1 AA compliance status (as of 2026-02-27):

| Check | Status |
|-------|--------|
| HTML lang attribute | Set to "en" in index.html |
| Skip navigation link | Present in PublicNav and DashboardLayout |
| aria-current on nav links | Implemented on all PublicNav links (desktop + mobile) |
| Mobile menu aria | aria-expanded + aria-controls="mobile-menu" on hamburger button |
| Form labels | All inputs have associated htmlFor labels with matching ids |
| Focus indicators | focus:ring-2 on all interactive elements |
| Image alt text | All decorative SVGs have aria-hidden="true" |
| Heading hierarchy | h1 -> h2 -> h3 order verified, no skipped levels |
| Error messages | role="alert" on all form error containers |
| Keyboard navigation | All interactive elements reachable via keyboard |

Lighthouse Accessibility Score: Pending — run `npx lighthouse http://localhost:3104 --only-categories=accessibility`

---

**Built in**: ~100 minutes
**Purpose**: Rapid concept validation
**Status**: Demo-ready prototype
