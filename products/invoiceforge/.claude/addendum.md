# InvoiceForge -- Agent Context Addendum

This document provides product-specific context for ConnectSW agents working on InvoiceForge.

## Product Overview

**Name**: InvoiceForge
**Type**: Web App (Full SaaS Product)
**Status**: Pre-Development (PRD Complete)
**Product Directory**: `products/invoiceforge/`
**Frontend Port**: 3109
**Backend Port**: 5004
**Database**: PostgreSQL (database name: `invoiceforge_dev`)

**What It Does**: InvoiceForge is a single-feature SaaS where freelancers and consultants type a plain English description of their work and get a professional, formatted invoice with line items, tax calculations, totals, and an optional Stripe payment link. The core loop is: describe work -> AI generates invoice -> preview/edit -> download PDF or share link -> get paid.

**Target Users**: Freelancers, independent consultants, small agencies (2-10 people).

**Monetization**: Freemium model.
- Free: 5 invoices/month
- Pro ($9/month): Unlimited invoices
- Team ($29/month): Unlimited + team features (Phase 2)

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| `/` | MVP | Landing page (marketing, value prop) |
| `/signup` | MVP | Registration (email/password + Google OAuth) |
| `/login` | MVP | Login |
| `/forgot-password` | MVP | Password reset request |
| `/reset-password` | MVP | Password reset with token |
| `/dashboard` | MVP | Main dashboard (invoice list + summary cards) |
| `/dashboard/invoices` | MVP | Full invoice list with filters and search |
| `/dashboard/invoices/new` | MVP | AI invoice creation (natural language input) |
| `/dashboard/invoices/:id` | MVP | Invoice detail (preview + actions) |
| `/dashboard/invoices/:id/edit` | MVP | Invoice editor (manual field editing) |
| `/dashboard/clients` | MVP | Client list |
| `/dashboard/clients/new` | MVP | Add new client |
| `/dashboard/clients/:id` | MVP | Client detail + invoice history |
| `/dashboard/settings` | MVP | Account settings (profile, Stripe connection) |
| `/dashboard/settings/billing` | MVP | Subscription plan management |
| `/invoice/:id/view` | MVP | Public invoice view (shareable, read-only) |
| `/invoice/:id/pay` | MVP | Stripe payment page for client |
| `/pricing` | MVP | Pricing page |
| `/dashboard/invoices/recurring` | Phase 2 | Recurring invoice management |
| `/dashboard/team` | Phase 2 | Team member management |
| `/dashboard/settings/branding` | Phase 2 | Logo, colors, font customization |

## Business Logic

### Invoice Number Sequencing

Each user has an independent invoice counter. Numbers follow the format `INV-{NNNN}` where NNNN is zero-padded and auto-incremented per user:
- First invoice: `INV-0001`
- Second invoice: `INV-0002`
- Numbers never reuse, even if invoices are deleted

### AI Invoice Generation Rules

The AI endpoint accepts free-text input (max 2,000 characters) and returns structured invoice data. The AI must extract:

1. **Client name**: Match against saved clients first; create a placeholder if no match.
2. **Line items**: Each with description, quantity, unit type (hours/days/items/flat), rate, and calculated amount.
3. **Tax**: If a percentage is mentioned ("8.5% tax", "apply 10% sales tax"), apply it to the subtotal. If no tax mentioned, tax is $0.
4. **Due date**: If mentioned ("due in 2 weeks", "net 45"), parse it. Default: Net 30 from today.
5. **Currency**: Always USD for MVP.

**Calculation rules**:
- Line item amount = quantity x rate (for hourly/daily/item) or flat amount
- Subtotal = sum of all line item amounts
- Tax amount = subtotal x (tax rate / 100), rounded to 2 decimal places
- Total = subtotal + tax amount
- All monetary values stored as integers (cents) in the database, displayed as dollars with 2 decimal places

**Error handling**: If the input lacks a billable item or amount, return an error message explaining what is missing. Never generate an invoice with $0 total.

### Invoice Status Workflow

```
Draft  -->  Sent  -->  Paid
                  -->  Overdue (automatic, when past due date)
```

- **Draft**: Newly created or edited. Not yet shared with client.
- **Sent**: User has copied the shareable link or downloaded the PDF. This is a one-way transition from Draft.
- **Paid**: Payment confirmed via Stripe webhook OR manually marked by user. Terminal state.
- **Overdue**: Automatically applied to "Sent" invoices past their due date. Reverts to "Paid" if payment received.

Deleted invoices: Only drafts can be deleted. Sent/Paid/Overdue invoices can be archived (hidden from default view) but not permanently deleted (tax compliance).

### Payment Flow (Stripe)

1. **User connects Stripe**: OAuth flow via Stripe Connect (Express accounts). User authorizes InvoiceForge to create payment links on their behalf.
2. **Payment link creation**: When user toggles "Include Payment Link" on an invoice, we create a Stripe Checkout Session for the invoice total using the user's connected Stripe account.
3. **Client pays**: Client clicks the payment link, which goes to Stripe Checkout. Payment goes directly to the user's Stripe account (InvoiceForge never touches the funds).
4. **Webhook confirmation**: Stripe sends `checkout.session.completed` to our webhook endpoint. We match by session metadata (invoice ID) and update status to "Paid".
5. **Idempotency**: Webhook handler checks if invoice is already "Paid" before updating. Duplicate events are ignored.

InvoiceForge does NOT charge a transaction fee on payments. Revenue comes solely from subscriptions. Stripe charges their standard fees (2.9% + $0.30) to the user's Stripe account directly.

### Tax Calculation Rules

- Tax is percentage-based, specified by the user in their natural language input.
- No automatic tax jurisdiction detection in MVP.
- Tax rate applies to the subtotal (all line items combined).
- If no tax rate is specified, tax is $0.00.
- Tax amount is rounded to 2 decimal places using banker's rounding (round half to even).
- Users can manually edit the tax rate in the invoice editor.
- Common examples the AI should recognize: "8.5% tax", "apply sales tax of 10%", "plus 7% VAT", "tax-exempt" (sets rate to 0%).

### Subscription Enforcement

- Free tier: 5 invoices per calendar month. Counter resets on the 1st of each month at midnight UTC.
- Counter increments when an invoice moves from "generating" to "Draft" (successful AI generation).
- Editing an existing invoice does not count against the limit.
- Deleting a draft does not restore the count.
- When limit is reached: show a non-blocking upgrade modal. User can still access existing invoices and clients.
- Pro/Team tier: No invoice limit. Managed via Stripe Billing with monthly or annual billing cycle.

### Client Auto-Matching

When the AI extracts a client name from the input text:
1. Fuzzy match against saved client names (case-insensitive, ignoring "Inc", "LLC", "Corp" suffixes).
2. If match confidence > 80%, auto-populate client details from saved record.
3. If no match, leave client fields editable with the extracted name pre-filled.
4. User can always override the matched client or create a new one.

### PDF Generation

- PDFs are generated server-side (not in the browser).
- Layout: Single-column, professional invoice template.
- Content: Business name (from), client details (to), invoice number, dates, line items table, subtotal, tax, total, notes, payment link (if attached).
- File naming: `INV-{number}-{client-name-slugified}.pdf`
- Page limit: Designed for single page; overflows to second page gracefully for invoices with 10+ line items.
- No custom branding in MVP (logo upload is Phase 2). Uses a clean default template.

## Special Considerations

### AI Prompt Engineering

The AI invoice generation is the core product. The prompt must be carefully engineered to:
- Handle varied input styles (formal, casual, terse, verbose)
- Extract multiple line items from a single paragraph
- Distinguish between hourly rates, daily rates, flat fees, and per-item pricing
- Handle edge cases: "40 hours at $125" vs "$125/hr for 40 hours" vs "125 per hour, 40 hours"
- Recognize tax instructions in multiple formats
- Return structured JSON that maps directly to the invoice schema
- Never hallucinate amounts or quantities not present in the input

The prompt should use structured output (JSON mode) to ensure consistent parsing.

### Data Privacy

- Invoice content may contain sensitive business information (client names, rates, project details).
- AI prompts should NOT log invoice content beyond what is needed for generation.
- All invoice data is encrypted at rest and in transit.
- Users own their data and can export or delete it at any time.

### Stripe Integration Considerations

- Stripe Connect Express is the simplest integration for our use case (user connects, we create sessions).
- Stripe webhook endpoint must be publicly accessible and verify signatures using the webhook signing secret.
- Handle edge cases: user disconnects Stripe after creating invoices with payment links (show "Payment link unavailable" on those invoices).
- Stripe test mode for development; live mode for production.

### Free Tier Abuse Prevention

- Rate limit AI generation: 60 requests/minute per user (prevents scripted abuse).
- Invoice counter is server-side (not client-manipulable).
- Account creation rate limited by IP (max 3 accounts per IP per day).
- No anonymous invoice generation; authentication required.

## Tech Stack

_To be filled by Architect._

## Architecture

_To be filled by Architect._

---

**Created by**: Product Manager
**Last Updated**: 2026-02-01
**Status**: PRD complete, awaiting Architecture
