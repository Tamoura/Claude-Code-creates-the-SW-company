# Phase 1 Features

## Branch: feature/stablecoin-gateway/phase1-features

## Features
1. Payment Links API - shareable payment links with short codes
2. QR Code Payments - auto-generate QR codes for payment addresses
3. Embeddable Checkout Widget - drop-in script tag for merchants
4. Email Receipts & Notifications - receipt/notification on payment events

## Implementation Progress

### 1. Payment Links API
- [x] Prisma model: PaymentLink
- [ ] Service: payment-link.service.ts
- [ ] Route: routes/v1/payment-links.ts
- [ ] Tests
- [ ] Register in app.ts

### 2. QR Code Payments
- [ ] QR code generation utility
- [ ] QR endpoint on payment links
- [ ] Integration with checkout page

### 3. Embeddable Checkout Widget
- [ ] Widget HTML/JS bundle
- [ ] Serving endpoint
- [ ] Customization options

### 4. Email Receipts & Notifications
- [x] Prisma model: NotificationPreference
- [ ] Email service
- [ ] Templates
- [ ] Integration with payment events
