# Security Fixes - stablecoin-gateway

Branch: fix/stablecoin-gateway/security-fixes
Base: feature/stablecoin-gateway/phase1-features

## Fixes Applied

1. **Payment Links Route Ordering** (payment-links.ts)
   - Moved `GET /resolve/:shortCode` and `GET /:id/qr` BEFORE `GET /:id`
   - Prevents Fastify from matching "resolve" as an `:id` parameter
   - Removed duplicate route definitions from end of file

2. **Admin Routes Validation** (admin.ts)
   - Added Zod schemas: `merchantListQuerySchema` and `merchantPaymentsQuerySchema`
   - Added `try-catch` blocks around both route handlers
   - Replaced `any` type with `Prisma.UserWhereInput` and `Prisma.PaymentSessionWhereInput`
   - Added `ZodError` handling with 400 responses
   - Added logger import for error logging

3. **Logout Token Ownership** (auth.ts)
   - Already correctly implemented. The `where` clause at line 319 includes `userId`
   - No changes needed

4. **Notifications Duplicate validateBody** (notifications.ts)
   - Added import of `validateBody` from `../../utils/validation.js`
   - Removed local duplicate function definition (lines 42-44)

5. **Gitignore .env**
   - Already present in `apps/api/.gitignore` (line 11)
   - Already present in root `.gitignore` (line 13)
   - No changes needed
