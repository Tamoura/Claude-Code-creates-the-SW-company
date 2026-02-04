# Phase 1A: Settings Page - Wire to Real API

## Branch
`feature/stablecoin-gateway/settings-api`

## Tasks
1. Backend: POST /v1/auth/change-password endpoint
2. Frontend: Add changePassword, notification prefs, deleteAccount to ApiClient
3. Frontend: Create useSettings hook
4. Frontend: Wire Settings.tsx to real API
5. Frontend: Wire delete account

## Key Findings
- Notification preferences backend already exists (GET/PATCH /v1/notifications/preferences)
- No change-password endpoint exists yet
- Settings.tsx currently uses console.log stubs
- Password validation schemas exist (signupSchema pattern) to reuse
