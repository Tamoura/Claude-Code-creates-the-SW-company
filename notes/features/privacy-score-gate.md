# Privacy Score Gate Fix

## Objective
Raise Privacy audit dimension from 7/10 to 8/10+ by implementing:
- GDPR Art 18: Right to Restrict Processing
- GDPR Art 21: Right to Object
- Dark mode contrast fixes (BottomNav, LanguageToggle)
- LOG_SALT production guard

## Branch
`fix/connectin/privacy-score-gate` against `main`

## Changes
1. **Schema**: 4 new User fields (processingRestricted, processingRestrictedAt, objectionRegistered, objectionRegisteredAt)
2. **Security Events**: 4 new event types for restrict/object actions
3. **Auth Service**: 4 new methods (restrictProcessing, liftRestriction, registerObjection, withdrawObjection)
4. **Auth Routes**: 4 new endpoints (POST/DELETE /restrict-processing, POST/DELETE /object-to-processing)
5. **Frontend**: BottomNav + LanguageToggle dark:text color bump (#94A3B8 → #CBD5E1)
6. **Security**: LOG_SALT throws in production if not set

## Test Plan
~12 new tests in auth.test.ts covering both GDPR rights
