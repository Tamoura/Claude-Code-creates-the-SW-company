# Muaththir: Profile, Forgot-Password, Reset-Password Endpoints

## Summary
Added three groups of endpoints to the Muaththir API:

1. **POST /api/auth/forgot-password** - Generates a reset token (UUID) stored in the parent record. Returns a generic message regardless of whether the email exists (security best practice). Token expires in 1 hour.

2. **POST /api/auth/reset-password** - Validates reset token, updates password hash, clears token fields. Returns 400 for invalid/expired tokens.

3. **Profile routes** (new file `src/routes/profile.ts`):
   - GET /api/profile - Returns authenticated parent profile with child count
   - PUT /api/profile - Updates name and/or email (with duplicate email check)
   - PUT /api/profile/password - Changes password (requires current password verification)

## Schema
The Prisma schema already had `resetToken` and `resetTokenExp` fields on the Parent model. No migration was needed.

## Test Coverage
- 15 new auth tests (forgot-password + reset-password)
- 19 new profile tests
- All 217 tests pass (184 existing + 33 new)

## Design Decisions
- Forgot-password always returns 200 with the same message to prevent email enumeration
- Reset token is a UUID (crypto.randomUUID) - simple and sufficient for MVP
- No email sending in MVP - token is logged in development mode
- Password validation reuses the same Zod schema as registration
- Profile route follows same patterns as children/observations routes
