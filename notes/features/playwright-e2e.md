# Playwright E2E Tests - Fix & Expand

## Branch
`feature/stablecoin-gateway/playwright-e2e`

## Key Findings from UI Exploration

### Page Routes
- `/` - Landing page (marketing, no payment form)
- `/login` - Login (`#email`, `#password`)
- `/signup` - Signup (`#email`, `#password`, `#confirm-password`, 5 password requirements)
- `/dashboard` - Stats + recent transactions + "View All" button
- `/dashboard/payments` - Filter buttons (All/Completed/Pending/Failed) + table
- `/dashboard/invoices` - Table of completed payments as invoices
- `/dashboard/api-keys` - CRUD with `#key-name`, permission checkboxes
- `/dashboard/webhooks` - CRUD with `#wh-url`, `#wh-desc`, event checkboxes
- `/dashboard/security` - Password change, sessions, danger zone
- `/dashboard/settings` - Coming soon placeholder
- `/dashboard/admin/merchants` - Admin-only merchants list

### No payment-links page exists
The plan called for `payment-links.spec.ts` but there is no `/dashboard/payment-links` route.
Payment links are created via API or "Simulate Payment" button. Will skip this test file.

### API Keys Form
- Name input: `#key-name`
- Permissions: checkboxes with `name="read"`, `name="write"`, `name="refund"`
- Created key shown in `<code>` with copy button
- Key prefix shown in table, not full key

### Webhooks Form
- URL input: `#wh-url`
- Description: `#wh-desc`
- Events: checkboxes in grid-cols-2
- Webhook actions: Toggle, Edit, Rotate Secret, Delete
- Secret shown in banner on create/rotate

### Signup Password Requirements (real-time validation)
- 12+ characters
- Uppercase letter
- Lowercase letter
- Number
- Special character
- Confirm password match indicator
- Submit disabled until all pass

## Progress
- [ ] Baseline test run
- [ ] Fix failing tests
- [ ] Auth fixture
- [ ] Rewrite weak tests (api-keys, webhooks, dashboard)
- [ ] New tests (signup-flow, payments-list, invoices)
- [ ] Final verification
