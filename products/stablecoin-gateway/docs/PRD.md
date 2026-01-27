# Stablecoin Gateway - Product Requirements Document

**Version**: 1.0
**Status**: Draft
**Last Updated**: 2026-01-27
**Product Manager**: Claude Product Manager

---

## 1. Executive Summary

### 1.1 Vision

Stablecoin Gateway is a developer-friendly payment platform that enables merchants to accept stablecoin payments (USDC/USDT) with the simplicity of Stripe but at a fraction of the cost. We bridge the gap between traditional commerce and blockchain payments by abstracting away crypto complexity while delivering sub-1% transaction fees and instant settlement.

### 1.2 Problem Statement

Small to medium-sized online merchants lose 2-3% of their revenue to credit card processing fees, amounting to billions annually. Alternative payment methods like ACH are slow, and cryptocurrency solutions are either too complex (requiring custody, KYC, wallet management) or still expensive (1-2% fees).

**Core Problems We Solve**:
- **High Payment Fees**: Credit cards charge 2.9% + $0.30 per transaction
- **Slow Settlement**: Traditional payments take 2-7 days to settle
- **Crypto Complexity**: Existing crypto solutions require technical knowledge, wallet custody, and extensive onboarding
- **Volatility Fear**: Merchants fear crypto price swings
- **Chargeback Risk**: Credit card chargebacks create fraud exposure

**The Opportunity**: Stablecoins (USDC/USDT) offer the best of both worlds—crypto's speed and low fees with fiat's stability. But no one has made them as easy to use as Stripe.

### 1.3 Target Market

**Primary**: Online merchants with annual revenue between $50k-$5M
- E-commerce (Shopify, WooCommerce)
- SaaS companies (subscription billing)
- Digital goods sellers (courses, templates, software)
- Service providers (consulting, freelancing)

**Secondary**: Large enterprises seeking cost reduction (future phase)

**Initial Launch Market**: US-based merchants, English-only

### 1.4 Success Metrics

**Business KPIs**:
- **Merchants Onboarded**: 100 merchants in first 3 months
- **Transaction Volume**: $1M+ processed in first quarter
- **Merchant Retention**: 80%+ after 90 days
- **Revenue**: 0.5% fee per transaction = $5k MRR at $1M volume

**Product KPIs**:
- **Payment Success Rate**: >95% (customer completes payment)
- **Time to First Payment**: <10 minutes from signup
- **Checkout Abandonment Rate**: <20%
- **Average Transaction Time**: <2 minutes (from click to confirmation)
- **API Uptime**: 99.9%

**User Experience KPIs**:
- **Merchant NPS**: >50
- **Customer Payment Satisfaction**: >4.5/5
- **Support Ticket Volume**: <5% of transactions

---

## 2. User Personas

### Persona 1: Sarah - Small E-commerce Owner

**Demographics**:
- Age: 32
- Role: Founder & Owner
- Business: Online boutique (Shopify store)
- Annual Revenue: $250k
- Technical Skill: Low (no coding experience)

**Goals**:
- Reduce payment processing fees from $7,250/year to under $2,000/year
- Get paid faster (daily vs. weekly payouts)
- Offer customers a "crypto-friendly" payment option
- Avoid credit card chargebacks

**Pain Points**:
- Stripe/PayPal fees eat into her thin margins (15% of revenue)
- Chargebacks from fraudulent customers
- Doesn't understand crypto wallets or blockchain
- Scared of regulatory issues with crypto

**Usage Context**:
- Checks payment dashboard daily on laptop
- Needs simple integration (copy/paste code snippet)
- Wants email notifications for every payment
- Expects phone/email support for issues

**What Sarah Says**:
_"I love the idea of cheaper fees, but I don't want to become a crypto expert. It needs to work like Stripe—dead simple."_

---

### Persona 2: David - SaaS Founder

**Demographics**:
- Age: 28
- Role: Technical Co-founder
- Business: B2B SaaS tool (API analytics)
- Annual Revenue: $500k (growing 20% MoM)
- Technical Skill: High (full-stack developer)

**Goals**:
- Integrate payment gateway via API in under 2 hours
- Support subscription billing (monthly/annual)
- Reduce fees to maximize runway
- Offer competitive pricing by passing savings to customers

**Pain Points**:
- Current payment processor (Stripe) takes 2.9% + $0.30 per transaction
- International customers face high currency conversion fees
- Wants webhook notifications for payment events
- Needs programmatic refund capabilities

**Usage Context**:
- Integrates via REST API and JavaScript SDK
- Monitors payments via API dashboard
- Uses webhooks to automate invoice generation
- Expects comprehensive API documentation

**What David Says**:
_"I need an API that's as good as Stripe's. If I can integrate it in an afternoon and save 2% on fees, I'm in."_

---

### Persona 3: Marcus - Digital Product Creator

**Demographics**:
- Age: 45
- Role: Solo creator (course instructor)
- Business: Online courses + digital templates
- Annual Revenue: $120k
- Technical Skill: Medium (comfortable with WordPress, no-code tools)

**Goals**:
- Sell courses without giving up 30% to platforms (Udemy, Teachable)
- Accept payments directly on his website
- Avoid PayPal holds (they froze his account twice)
- Keep 99.5% of revenue (after 0.5% fee)

**Pain Points**:
- Platform fees are too high (30% on Udemy)
- PayPal has frozen his funds multiple times
- Credit card fees add up ($3,600/year)
- Customers in emerging markets can't pay with credit cards

**Usage Context**:
- Uses WordPress + WooCommerce for his website
- Needs a plugin or payment button widget
- Wants instant notifications via email when someone buys
- Checks payment dashboard weekly

**What Marcus Says**:
_"I just want a pay button I can drop on my website. No dealing with wallet addresses or blockchain jargon."_

---

## 3. Features

### 3.1 MVP Features (Must Have)

| ID | Feature | User Story | Priority | Phase |
|----|---------|------------|----------|-------|
| F-001 | Payment Link Generator | As a merchant, I want to create payment links instantly so I can accept payments without code | P0 | MVP |
| F-002 | Hosted Checkout Page | As a customer, I want to pay with MetaMask or WalletConnect in under 2 minutes so I can complete purchases quickly | P0 | MVP |
| F-003 | Real-time Payment Status | As a merchant, I want to see payment status update in real-time so I know when to fulfill orders | P0 | MVP |
| F-004 | Merchant Dashboard | As a merchant, I want to view all payments, filter by status, and export CSV so I can reconcile transactions | P0 | MVP |
| F-005 | Webhook Notifications | As a developer, I want to receive webhook events when payments complete so I can automate fulfillment | P0 | MVP |
| F-006 | JavaScript SDK | As a developer, I want to integrate checkout in my frontend in under 30 lines of code | P0 | MVP |
| F-007 | API Integration | As a developer, I want to create payment sessions programmatically via REST API | P0 | MVP |
| F-008 | USDC/USDT Support | As a customer, I want to pay with USDC or USDT on Ethereum or Polygon | P0 | MVP |
| F-009 | Email Notifications | As a merchant, I want email alerts for completed payments so I don't miss orders | P0 | MVP |
| F-010 | Transaction History | As a merchant, I want to see all past transactions with blockchain explorer links | P0 | MVP |

### 3.2 Phase 2 Features (Should Have)

| ID | Feature | User Story | Priority | Phase |
|----|---------|------------|----------|-------|
| F-011 | Refunds | As a merchant, I want to issue refunds to customers' wallets | P1 | Phase 2 |
| F-012 | Multi-currency Support | As a merchant, I want to display prices in USD/EUR/GBP while receiving stablecoins | P1 | Phase 2 |
| F-013 | Subscription Billing | As a SaaS founder, I want to charge customers monthly/annually | P1 | Phase 2 |
| F-014 | Analytics Dashboard | As a merchant, I want to see charts for daily volume, success rate, and top customers | P1 | Phase 2 |
| F-015 | Team Roles | As a business owner, I want to invite team members with view-only or admin access | P1 | Phase 2 |

### 3.3 Future Considerations (Nice to Have)

- Fiat off-ramp (auto-convert stablecoins to USD bank account)
- Mobile app for merchants
- WooCommerce, Shopify, Stripe plugins
- Support for other blockchains (Solana, Avalanche)
- Fraud detection and risk scoring
- Customer wallet whitelisting (for subscriptions)
- Invoice generation and tax reporting tools

---

## 4. User Flows

### 4.1 Payment Link Flow (Merchant)

```
Merchant logs in
  → Dashboard homepage
  → Clicks "Create Payment Link"
  → Enters amount ($100) + description ("Order #1234")
  → Clicks "Generate Link"
  → Copies link to clipboard
  → Shares link with customer (email, SMS, social)
  → Receives email notification when payment completes
  → Views transaction in dashboard
```

**Time to Complete**: <1 minute

---

### 4.2 Checkout Flow (Customer)

```
Customer clicks payment link
  → Hosted checkout page loads
  → Sees payment details ($100, merchant name, description)
  → Clicks "Connect Wallet"
  → MetaMask/WalletConnect modal opens
  → Customer approves wallet connection
  → Clicks "Pay with USDC"
  → MetaMask prompts transaction approval
  → Customer approves transaction
  → Checkout page shows "Confirming on blockchain..."
  → 3-15 seconds later: "Payment Complete!"
  → Redirected to merchant's success URL (optional)
```

**Time to Complete**: 1-2 minutes (first-time users), 30 seconds (returning users)

---

### 4.3 API Integration Flow (Developer)

```
Developer creates account
  → Generates API key in dashboard
  → Installs SDK: npm install @stablecoin-gateway/sdk
  → Adds 10 lines of code to create payment session
  → Customer redirected to hosted checkout
  → Payment completes
  → Webhook sent to developer's server
  → Developer's server fulfills order
```

**Time to Complete**: <30 minutes

---

### 4.4 Refund Flow (Merchant)

```
Merchant navigates to transaction in dashboard
  → Clicks "Issue Refund"
  → Confirms refund amount (full or partial)
  → Enters reason (optional)
  → Clicks "Process Refund"
  → Stablecoins sent back to customer's wallet
  → Customer receives email notification
  → Transaction marked as "Refunded" in dashboard
```

**Time to Complete**: <2 minutes

---

## 5. Requirements

### 5.1 Functional Requirements

**Authentication & Accounts**:
- FR-001: Users can sign up with email + password
- FR-002: Users can log in with Google OAuth
- FR-003: Users can reset password via email link
- FR-004: API keys can be generated and revoked

**Payment Creation**:
- FR-005: Merchants can create payment links with amount + description
- FR-006: Developers can create payment sessions via REST API
- FR-007: Payment amounts support USD with 2 decimal precision
- FR-008: Payment links expire after 7 days (configurable)

**Checkout**:
- FR-009: Customers can connect wallets via MetaMask browser extension
- FR-010: Customers can connect wallets via WalletConnect (mobile)
- FR-011: Checkout page displays payment amount in USDC/USDT equivalent
- FR-012: Checkout validates customer has sufficient balance before allowing payment
- FR-013: Checkout supports Ethereum mainnet and Polygon networks

**Blockchain Integration**:
- FR-014: System monitors blockchain for payment confirmation
- FR-015: System marks payment complete after 3 block confirmations (Ethereum) or 64 confirmations (Polygon)
- FR-016: System handles failed transactions (insufficient gas, rejected by user)
- FR-017: System stores transaction hash for each payment

**Notifications**:
- FR-018: System sends webhook POST request to merchant's URL on payment events (created, completed, failed, refunded)
- FR-019: System retries webhooks 3 times with exponential backoff on failure
- FR-020: System sends email to merchant when payment completes
- FR-021: System sends email to customer with payment receipt (if email provided)

**Dashboard**:
- FR-022: Merchants can view all payments (paginated, 50 per page)
- FR-023: Merchants can filter payments by status (all, pending, completed, failed, refunded)
- FR-024: Merchants can search payments by transaction hash or description
- FR-025: Merchants can export payment history as CSV
- FR-026: Dashboard displays total volume and fee savings

**Refunds**:
- FR-027: Merchants can issue full or partial refunds within 90 days
- FR-028: Refunds are sent back to original customer wallet address
- FR-029: Refunds deduct merchant's available balance
- FR-030: Refunded payments are marked with "Refunded" badge

### 5.2 Non-Functional Requirements

**Performance**:
- NFR-001: Hosted checkout page loads in <2 seconds (LCP)
- NFR-002: Payment confirmation detected within 30 seconds of blockchain confirmation
- NFR-003: API response time <200ms (p95) for payment creation endpoints
- NFR-004: Dashboard loads payment list in <1 second for up to 10,000 transactions
- NFR-005: Webhook delivery latency <5 seconds after payment confirmation

**Security**:
- NFR-006: All API communication uses HTTPS with TLS 1.3
- NFR-007: API keys stored hashed with bcrypt (cost factor 12)
- NFR-008: Webhooks signed with HMAC-SHA256 for verification
- NFR-009: Private keys for wallet hot storage use HSM or AWS KMS
- NFR-010: User passwords meet minimum complexity (8 chars, 1 uppercase, 1 number)
- NFR-011: Rate limiting: 100 requests/minute per API key
- NFR-012: CSRF protection on all state-changing endpoints

**Reliability**:
- NFR-013: API uptime SLA of 99.9% (8.7 hours downtime/year max)
- NFR-014: System handles blockchain re-orgs gracefully (waits for 3+ confirmations)
- NFR-015: Database backups run daily with 30-day retention
- NFR-016: Failed webhook deliveries retried with exponential backoff (1s, 10s, 60s)

**Scalability**:
- NFR-017: System supports 1,000 concurrent payment sessions
- NFR-018: System processes 100 payments per minute at peak
- NFR-019: Database design supports 10M+ transactions
- NFR-020: Blockchain monitoring service can track 1,000 pending payments simultaneously

**Accessibility**:
- NFR-021: Hosted checkout page meets WCAG 2.1 Level AA
- NFR-022: Dashboard supports keyboard navigation
- NFR-023: Color contrast ratio ≥4.5:1 for all text
- NFR-024: Screen reader compatible (ARIA labels)

**Compliance**:
- NFR-025: GDPR-compliant data handling (user consent, right to deletion)
- NFR-026: AML/KYC not required for MVP (payment amounts <$10,000)
- NFR-027: Terms of service and privacy policy displayed on signup
- NFR-028: Transaction logs retained for 7 years (regulatory requirement)

**Observability**:
- NFR-029: All API requests logged with request ID for tracing
- NFR-030: System emits metrics for payment success rate, latency, error rate
- NFR-031: Alerting for blockchain node connection failures
- NFR-032: Centralized logging with 90-day retention

---

## 6. Site Map

| Route | Status | Description |
|-------|--------|-------------|
| / | MVP | Landing page (marketing) |
| /signup | MVP | User registration |
| /login | MVP | User login |
| /dashboard | MVP | Main merchant dashboard (payment list) |
| /dashboard/payments | MVP | Payment history table |
| /dashboard/payments/:id | MVP | Individual payment details |
| /dashboard/create | MVP | Payment link generator form |
| /dashboard/settings | MVP | Account settings (email, password, API keys) |
| /dashboard/analytics | Phase 2 | Analytics charts (coming soon) |
| /dashboard/team | Phase 2 | Team management (coming soon) |
| /checkout/:sessionId | MVP | Hosted checkout page (customer-facing) |
| /checkout/:sessionId/success | MVP | Payment success page |
| /checkout/:sessionId/failed | MVP | Payment failed page |
| /docs | MVP | API documentation (static site) |
| /docs/quickstart | MVP | Quick start guide |
| /docs/api-reference | MVP | REST API reference |
| /docs/webhooks | MVP | Webhook guide |
| /docs/sdk | MVP | JavaScript SDK guide |
| /help | Coming Soon | Help center (placeholder) |
| /pricing | MVP | Pricing page (0.5% fee) |

---

## 7. Acceptance Criteria

### F-001: Payment Link Generator

**Given** a logged-in merchant
**When** they enter amount ($100) and description ("Order #1234")
**Then** a payment link is generated with unique ID
**And** the link is copyable to clipboard
**And** the link expires after 7 days

---

### F-002: Hosted Checkout Page

**Given** a customer visits a payment link
**When** they click "Connect Wallet"
**Then** MetaMask or WalletConnect modal opens
**And** after approving connection, wallet address is displayed
**And** "Pay with USDC" button is enabled

**Given** a connected wallet
**When** customer clicks "Pay with USDC"
**Then** wallet prompts transaction approval
**And** after approval, payment status shows "Confirming..."
**And** after 3 block confirmations, status shows "Complete"

---

### F-003: Real-time Payment Status

**Given** a payment in "confirming" status
**When** blockchain confirms the transaction (3+ blocks)
**Then** dashboard updates status to "Completed" within 30 seconds
**And** status badge color changes from yellow to green
**And** transaction hash link becomes clickable (to block explorer)

---

### F-004: Merchant Dashboard

**Given** a merchant with 100+ payments
**When** they navigate to /dashboard/payments
**Then** payments are displayed in table with columns: Date, Amount, Status, Transaction Hash
**And** table is paginated (50 per page)
**And** filter dropdown allows filtering by status
**And** search box filters by description or transaction hash
**And** "Export CSV" button downloads all filtered results

---

### F-005: Webhook Notifications

**Given** a merchant has configured webhook URL in settings
**When** a payment completes
**Then** a POST request is sent to webhook URL within 5 seconds
**And** request body contains payment details (id, amount, status, txHash)
**And** request includes HMAC signature header for verification
**And** if webhook fails, system retries 3 times (1s, 10s, 60s delays)

---

### F-006: JavaScript SDK

**Given** a developer installs SDK via npm
**When** they initialize SDK with API key
**And** call `gateway.createPaymentSession({ amount: 100 })`
**Then** API returns checkout URL
**And** developer can redirect customer to checkout URL
**And** SDK provides `onSuccess` callback for payment completion

---

### F-007: API Integration

**Given** a developer with valid API key
**When** they POST to `/api/v1/payment-sessions` with `{ amount: 100, currency: "USD" }`
**Then** API returns 201 with payment session object
**And** object includes `id`, `checkoutUrl`, `status`, `expiresAt`
**And** API response time is <200ms (p95)

---

### F-008: USDC/USDT Support

**Given** a customer on checkout page
**When** they select "USDC" or "USDT"
**Then** payment amount is displayed in selected stablecoin
**And** customer can choose Ethereum or Polygon network
**And** transaction is sent to correct token contract address

---

### F-009: Email Notifications

**Given** a merchant with email notifications enabled
**When** a payment completes
**Then** merchant receives email with subject "Payment Received: $100"
**And** email includes amount, description, transaction hash, timestamp
**And** email is sent within 60 seconds of payment confirmation

---

### F-010: Transaction History

**Given** a merchant on dashboard
**When** they click on a payment
**Then** detail page shows full payment info: amount, status, description, timestamp, transaction hash
**And** transaction hash is clickable link to Etherscan/Polygonscan
**And** customer wallet address is displayed (truncated with copy button)
**And** block confirmation count is shown

---

## 8. Out of Scope

**Explicitly NOT included in MVP**:
- ❌ Fiat on-ramp/off-ramp (bank account withdrawals)
- ❌ Support for non-stablecoin cryptocurrencies (BTC, ETH)
- ❌ Built-in KYC/AML identity verification
- ❌ Recurring billing/subscriptions (Phase 2)
- ❌ Mobile apps (iOS/Android)
- ❌ White-label / reseller program
- ❌ Multi-signature wallets
- ❌ Support for L2s beyond Polygon (Arbitrum, Optimism)
- ❌ NFT-gated payments
- ❌ Fiat currency conversion API
- ❌ Dispute resolution / escrow

---

## 9. Dependencies

**External Services**:
- **Blockchain Nodes**: Infura or Alchemy for Ethereum/Polygon RPC access
- **Wallet Providers**: MetaMask browser extension, WalletConnect v2 protocol
- **Email Service**: SendGrid or AWS SES for transactional emails
- **Database**: PostgreSQL 15+ for payment records, user accounts
- **Authentication**: Auth0 or custom JWT implementation
- **Monitoring**: Datadog or Grafana for metrics and logging
- **CDN**: Cloudflare for hosted checkout page delivery

**Smart Contracts**:
- USDC token contract (Ethereum: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
- USDT token contract (Ethereum: 0xdAC17F958D2ee523a2206206994597C13D831ec7)
- USDC token contract (Polygon: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174)
- USDT token contract (Polygon: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F)

**Third-party Libraries**:
- ethers.js (blockchain interaction)
- WalletConnect SDK (mobile wallet support)
- Prisma ORM (database access)
- Fastify (API server)
- React + Next.js (frontend)

---

## 10. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Blockchain node outage (Infura/Alchemy) | High - payments fail | Low | Use fallback RPC providers (3+ providers), health check every 30s |
| Smart contract bug (token approval exploit) | Critical - loss of funds | Low | Use only audited token contracts (USDC/USDT), no custom contracts |
| Regulatory crackdown (SEC classifies stablecoins as securities) | High - business shutdown | Medium | Consult legal counsel, add disclaimers, monitor regulatory developments |
| Gas price spike (Ethereum congestion) | Medium - slow confirmations | Medium | Default to Polygon (lower fees), show estimated gas cost before payment |
| Merchant chargebacks (customer claims fraud) | Low - no recourse | Low | Clear terms of service, no chargebacks for crypto (irreversible) |
| Wallet phishing (fake MetaMask popup) | Medium - user loses funds | Medium | Educate users, verify domain in checkout, WalletConnect security |
| Low merchant adoption (no one wants this) | High - product failure | Medium | Pre-launch: interview 20 merchants, offer 90-day free trial |
| Customer doesn't own crypto wallet | Medium - checkout abandonment | High | Offer "Buy USDC" link to Coinbase/Moonpay, educational tooltips |

---

## 11. Technical Constraints

### Blockchain Limitations

**Transaction Speed**:
- Ethereum: 12 seconds per block, 3 blocks for confirmation = ~36 seconds
- Polygon: 2 seconds per block, 64 blocks for confirmation = ~128 seconds
- **Implication**: Customers wait 30-120 seconds after approving payment

**Gas Fees**:
- Ethereum: $5-$50 per transaction (variable based on congestion)
- Polygon: $0.01-$0.50 per transaction
- **Implication**: Ethereum only viable for payments >$100, must default to Polygon

**Wallet Requirement**:
- Customers must install MetaMask or have WalletConnect-compatible wallet
- **Implication**: 30-40% of customers may not have wallets, need onboarding flow

**Irreversibility**:
- Blockchain transactions cannot be reversed
- **Implication**: Refunds require new transaction, merchant must maintain hot wallet balance

### Infrastructure Constraints

**RPC Rate Limits**:
- Infura free tier: 100k requests/day
- **Implication**: Need paid plan at scale, implement request caching

**Database Storage**:
- Transaction history grows unbounded
- **Implication**: Partition by date, archive old transactions after 2 years

**Webhook Reliability**:
- Merchant servers may be down when webhook fires
- **Implication**: Implement retry logic + webhook history UI for manual replay

---

## 12. Go-to-Market Strategy

### Pricing

**Transaction Fee**: 0.5% per successful payment (no monthly fee, no setup fee)

**Comparison to Competitors**:
- Stripe: 2.9% + $0.30 = **~3%**
- PayPal: 2.9% + $0.30 = **~3%**
- Coinbase Commerce: 1% = **1%**
- BitPay: 1% = **1%**
- **Stablecoin Gateway**: 0.5% = **0.5%**

**Value Proposition**:
Save 2.4% per transaction vs. credit cards = $2,400 per $100k in sales

**Example Savings**:
| Annual Sales | Credit Card Fees | Stablecoin Gateway Fees | Savings |
|--------------|------------------|--------------------------|---------|
| $100k | $3,000 | $500 | $2,500 |
| $500k | $15,000 | $2,500 | $12,500 |
| $1M | $30,000 | $5,000 | $25,000 |

### Target Customer Acquisition

**Launch Partners (First 20 Customers)**:
- Direct outreach to Shopify store owners in crypto-friendly niches (NFTs, DeFi tools)
- Offer 90-day fee waiver (0% fees during trial)
- Requirement: 10+ transactions or $5k volume

**Marketing Channels**:
1. **Content Marketing**: Blog posts on "How to reduce payment fees"
2. **Developer Community**: Post on Hacker News, Reddit (r/webdev, r/entrepreneur)
3. **Partnerships**: Integrate with Shopify, WooCommerce app stores
4. **Paid Ads**: Google Ads targeting "Stripe alternatives", "low payment fees"
5. **Twitter/X**: Target crypto founders and e-commerce merchants

**Distribution Strategy**:
- **Phase 1** (Months 1-3): Payment links only (no integration required)
- **Phase 2** (Months 4-6): JavaScript SDK + API
- **Phase 3** (Months 7-12): Shopify/WooCommerce plugins

### Competitive Positioning

**vs. Stripe/PayPal**: 5x cheaper fees, instant settlement
**vs. Coinbase Commerce**: Stablecoin-only (no volatility), 2x cheaper
**vs. BitPay**: Developer-friendly API, no custody required

**Key Differentiator**: We're the only stablecoin-only gateway with Stripe-level developer experience.

---

## 13. Timeline

**MVP Development** (6 weeks):
- Week 1-2: Backend API + database schema + blockchain integration
- Week 3-4: Hosted checkout + wallet connections + payment monitoring
- Week 5: Merchant dashboard + webhooks
- Week 6: Testing + documentation + polish

**MVP Launch** (Week 7):
- Deploy to production
- Onboard first 5 launch partners
- Collect feedback

**Phase 2** (Weeks 8-12):
- Refund functionality
- Analytics dashboard
- Subscription billing (recurring payments)

**Milestones**:
- **Week 4**: Backend API complete, blockchain monitoring working
- **Week 6**: End-to-end payment flow complete (link → checkout → confirmation)
- **Week 7**: MVP launched with 5 paying merchants
- **Week 12**: 50 merchants onboarded, $100k+ processed

---

## 14. Open Questions

**For Architect**:
- [ ] Should we use a hot wallet for refunds or require merchants to connect their own wallets?
- [ ] How do we handle blockchain re-orgs (uncle blocks)?
- [ ] Should we support EIP-1559 transaction types or legacy?

**For CEO**:
- [ ] Should we support Bitcoin Lightning Network in Phase 2?
- [ ] Do we want to white-label this for other companies to resell?
- [ ] Should we offer fiat off-ramp (auto-convert stablecoins to USD)?

**For Legal**:
- [ ] Do we need money transmitter licenses (MTL) in all 50 US states?
- [ ] Is USDC/USDT considered a security by the SEC?
- [ ] What are the tax reporting requirements for merchants?

---

## 15. Glossary

- **Stablecoin**: A cryptocurrency pegged to a fiat currency (e.g., USDC = $1 USD)
- **USDC**: USD Coin, issued by Circle, fully reserved 1:1 with USD
- **USDT**: Tether, issued by Tether Limited, most widely used stablecoin
- **Gas Fee**: Transaction fee paid to blockchain miners/validators
- **Block Confirmation**: Number of blocks mined after a transaction (more confirmations = more secure)
- **Webhook**: HTTP callback sent to merchant's server when event occurs
- **Hot Wallet**: Blockchain wallet connected to the internet (for refunds)
- **MetaMask**: Browser extension for interacting with Ethereum blockchain
- **WalletConnect**: Protocol for connecting mobile wallets to web apps
- **ERC-20**: Token standard on Ethereum (USDC and USDT are ERC-20 tokens)
- **Polygon**: Layer 2 blockchain with lower fees than Ethereum
- **Smart Contract**: Self-executing code on blockchain (USDC/USDT are smart contracts)

---

**End of Document**
