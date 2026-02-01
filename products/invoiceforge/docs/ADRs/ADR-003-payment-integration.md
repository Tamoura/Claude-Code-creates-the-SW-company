# ADR-003: Stripe Checkout + Connect for Payment Links

## Status

Accepted

## Context

InvoiceForge allows freelancers to attach payment links to their invoices
so clients can pay online. The payment flow must:

1. **Direct payments to the freelancer**: InvoiceForge never touches funds.
   Payments go directly to the user's own Stripe account.
2. **Simple merchant onboarding**: Users connect their existing Stripe
   account (or create one) with minimal friction.
3. **Hosted checkout**: Clients pay on a secure, trusted payment page.
   We must not handle credit card data ourselves.
4. **Automatic status updates**: When a client pays, the invoice status
   updates to "Paid" without manual intervention.
5. **PCI compliance**: We must never store, process, or transmit card
   numbers. Full PCI compliance through delegation to Stripe.

Additionally, InvoiceForge uses Stripe Billing for its own subscription
management (Free, Pro, Team tiers).

## Decision

Use **Stripe** with three products:

1. **Stripe Connect (Express)** for merchant onboarding
2. **Stripe Checkout** for client-facing payment pages
3. **Stripe Billing** for InvoiceForge subscription management

### Stripe Connect Express

Users connect their Stripe account via the Express account flow:

```
1. User clicks "Connect Stripe" in settings
2. Frontend redirects to Stripe Connect OAuth URL
3. User authorizes on Stripe's hosted page
4. Stripe redirects back with authorization code
5. Backend exchanges code for stripe_account_id
6. Account ID stored in users.stripe_account_id
```

Express accounts are the simplest Connect integration. Stripe handles
identity verification, payouts, and tax reporting for the connected
account. InvoiceForge only needs to store the `stripe_account_id`.

### Stripe Checkout (for invoice payment links)

When a user attaches a payment link to an invoice:

```
1. Backend creates a Stripe Checkout Session:
   - amount: invoice total (in cents)
   - currency: USD
   - stripe_account: user's connected account ID
   - metadata: { invoiceId, invoiceNumber }
   - success_url: /invoice/{token}/view?paid=true
   - cancel_url: /invoice/{token}/view
2. Checkout Session URL is stored on the invoice record
3. Client clicks payment link -> Stripe Checkout page
4. Client completes payment
5. Stripe sends checkout.session.completed webhook
6. Backend matches by metadata.invoiceId, updates status to Paid
```

### Stripe Billing (for subscriptions)

InvoiceForge's own subscription tiers are managed via Stripe Billing:

```
1. User clicks "Upgrade to Pro" on billing page
2. Frontend creates a Stripe Checkout Session (subscription mode)
3. User enters payment info on Stripe Checkout
4. Stripe creates subscription, sends invoice.paid webhook
5. Backend updates user.subscription_tier to "pro"
6. Cancellation and downgrades handled via Stripe Customer Portal
```

### Webhook Architecture

Single webhook endpoint: `POST /api/webhooks/stripe`

Events handled:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Mark invoice as paid (if metadata.invoiceId exists) |
| `customer.subscription.created` | Set user subscription tier |
| `customer.subscription.updated` | Update user subscription tier |
| `customer.subscription.deleted` | Downgrade to free tier |

Webhook security:

- Verify Stripe signature using `stripe.webhooks.constructEvent()`
- Use the webhook signing secret from Stripe Dashboard
- All handlers are idempotent (check current state before updating)

## Consequences

### Positive

- **No fund handling**: InvoiceForge never touches payments. Zero PCI
  scope beyond using Stripe.js/Checkout.
- **Trusted checkout**: Clients pay on Stripe's hosted page, which they
  recognize and trust. Higher payment completion rates.
- **Simple onboarding**: Express Connect handles all KYC/identity
  verification. Users connect in 2-3 minutes.
- **Automatic reconciliation**: Webhooks update invoice status in
  real-time. No manual "mark as paid" needed (though it is available
  as a fallback).
- **Subscription management**: Stripe Billing handles proration,
  invoicing, retries, and dunning for our own subscriptions.
- **Unified provider**: One Stripe account, one SDK, one webhook
  endpoint for both payment links and subscriptions.

### Negative

- **Stripe dependency**: If Stripe is down, payment links and
  subscription management are unavailable. Mitigated by Stripe's
  99.99% uptime SLA.
- **Stripe fees**: Stripe charges 2.9% + $0.30 per transaction,
  plus 0.25% for Connect. These fees are paid by the freelancer
  (not by InvoiceForge), but it is a cost users must accept.
- **Express account limitations**: We cannot customize the connected
  account's payout schedule or dashboard. Users manage their Stripe
  account separately.
- **Webhook complexity**: Must handle event ordering, retries, and
  idempotency. Stripe may send events out of order or duplicate them.

### Neutral

- Users who do not connect Stripe can still create and share invoices.
  Payment links are optional.
- Stripe Connect onboarding may take 1-2 business days for identity
  verification on new Stripe accounts. Existing Stripe users connect
  instantly.

## Alternatives Considered

### PayPal

- **Pros**: Widely recognized, large user base, PayPal Commerce
  Platform supports marketplace payments
- **Cons**: More complex API, higher fees for international payments,
  less developer-friendly, no equivalent to Stripe Checkout's
  polished hosted page, integration is more fragile
- **Why rejected**: Stripe has a superior developer experience, better
  documentation, and a more modern API. Our target users (freelancers
  and tech-savvy consultants) are more likely to have or prefer Stripe.

### Square

- **Pros**: Good for in-person payments, growing online presence
- **Cons**: Online payment APIs are less mature than Stripe, Connect
  equivalent (Square OAuth) is more limited, smaller developer
  ecosystem
- **Why rejected**: Square is optimized for retail/in-person. Our use
  case is purely online invoice payments. Stripe is the better fit.

### Building Custom Payment Integration

- **Pros**: No third-party dependency, full control over UX
- **Cons**: PCI DSS Level 1 compliance required (~$50K-500K/year),
  must build payment form, fraud detection, dispute handling, payout
  management. Years of work for a single developer.
- **Why rejected**: Completely impractical for a startup. PCI
  compliance alone costs more than our projected first-year revenue.

### Stripe Payment Links (no-code)

- **Pros**: Zero backend code needed, Stripe generates the link
- **Cons**: Cannot customize amount per invoice (each link is a
  fixed price or requires a Stripe Dashboard action), no metadata
  for automatic status matching, limited to Stripe Dashboard
  management
- **Why rejected**: Does not support dynamic invoice amounts. Each
  invoice has a unique total, so we need Checkout Sessions with
  programmatic amount setting and metadata for webhook matching.

## References

- Stripe Connect Express: https://stripe.com/docs/connect/express-accounts
- Stripe Checkout: https://stripe.com/docs/payments/checkout
- Stripe Billing: https://stripe.com/docs/billing
- Stripe Webhooks: https://stripe.com/docs/webhooks
- InvoiceForge PRD: FR-029 through FR-033, FR-044 through FR-049
