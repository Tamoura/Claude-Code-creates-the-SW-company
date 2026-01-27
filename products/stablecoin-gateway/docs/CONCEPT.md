# Stablecoin Gateway - Concept Document

**Prototype Goal**: Validate merchant demand for a simple crypto payment gateway that accepts stablecoins (USDC/USDT).

**Time Budget**: 2-4 hours total development time

---

## Problem Statement

Small to medium merchants lose 2-3% of revenue to credit card processing fees. They want cheaper alternatives but are scared of crypto volatility. Stablecoins (USDC, USDT) solve this - pegged to $1 USD, instant settlement, fees under 1%, no chargebacks.

**The Problem**: No simple "Stripe for stablecoins" exists. Existing crypto payment processors are:
- Too complex (require wallets, custody, KYC)
- Too expensive (still charge 1-2%)
- Not stablecoin-focused

## Target User

**Sarah - Small Business Owner**
- Runs an online store (Shopify, WooCommerce)
- Gross revenue: $50-500k/year
- Currently paying 2.9% + $0.30 per credit card transaction
- Wants to accept crypto but doesn't understand wallets
- Needs something as simple as Stripe

## Core Value Proposition

Accept USDC/USDT payments with one line of code. Pay 0.5% fee. Get paid in 5 minutes.

## Key Features (Prototype - 3 features only)

### 1. Payment Link Generator
**What**: Merchant enters amount, gets a payment link
**Why**: Simplest possible test - no integration, no code
**Success**: Merchant can create link and receive payment

**User Flow**:
```
Merchant → Enter $100 → Get payment link → Share with customer
Customer → Clicks link → Pays with wallet → Merchant sees payment
```

### 2. Payment Status Page
**What**: Real-time payment status tracker
**Why**: Shows blockchain transaction in simple terms
**Success**: Non-crypto user understands what's happening

**States**:
- Waiting for payment
- Confirming on blockchain (with timer)
- Complete

### 3. Mock Wallet Connection
**What**: Simulated MetaMask connection for demo
**Why**: Can't do real blockchain in 2 hours
**Success**: Flow feels real, validates UX

**Note**: Use fake transactions, fake balances. Just test the flow.

## What We're Testing

1. **Demand**: Do merchants want this?
2. **UX**: Can non-crypto users complete a payment?
3. **Value Prop**: Does "lower fees" resonate?

## Success Criteria (Prototype)

✅ **Built in under 4 hours**
✅ **Merchant can create payment link** (no code)
✅ **Customer can "pay" via mock wallet** (fake transaction)
✅ **Payment status updates in real-time** (simulated)
✅ **CEO can demo to 5 real merchants** for feedback

## Out of Scope (Prototype)

❌ Real blockchain integration
❌ Real wallet connections
❌ User accounts / authentication
❌ Database persistence
❌ Production security
❌ Multiple currencies
❌ Refunds
❌ Webhooks

## Tech Approach (Prototype)

- **Frontend Only**: React SPA (no backend)
- **State**: localStorage for "payments"
- **Wallet**: Mock MetaMask UI
- **Blockchain**: Fake transaction data
- **Styling**: Tailwind CSS + shadcn/ui

**Why**: Ship in 2 hours, validate concept, then rebuild properly if validated.

## Next Steps After Prototype

**If merchants love it**:
1. Real blockchain integration (Ethereum/Polygon)
2. Real wallet connections (MetaMask, WalletConnect)
3. Backend API for webhook notifications
4. Dashboard for payment history
5. Analytics and reporting

**If merchants don't care**:
- Kill the project
- Pivot to different crypto use case

## Risks

| Risk | Mitigation |
|------|------------|
| No one wants this | Talk to 5 merchants before building full version |
| Too complex for non-crypto users | Focus on dead-simple UX in prototype |
| Regulatory issues | Prototype doesn't touch real money |

---

**Next**: Architect creates minimal tech spec, Frontend Engineer builds in 2 hours.
