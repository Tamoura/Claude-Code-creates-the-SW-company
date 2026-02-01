# Feature: Wire StableFlow Frontend to Real Backend API

## Branch
`feature/stablecoin/real-api-integration`

## Summary
Eliminate mock mode by wiring the frontend to the real backend API.

## Changes
1. Extend `api-client.ts` with signup, API key CRUD, webhook CRUD
2. Create `ProtectedRoute.tsx` auth guard component
3. Create `Signup.tsx` page matching Login.tsx style
4. Update `App.tsx` with signup route and ProtectedRoute wrapper
5. Change `.env` default from mock=true to mock=false

## Key Findings
- Backend uses PATCH for webhook updates (confirmed in webhooks.ts)
- TokenManager stores tokens in memory only (security design)
- Backend signup returns: `{id, email, created_at, access_token, refresh_token}`
- Backend API key create returns: `{id, name, key, key_prefix, permissions, last_used_at, created_at}`
- Backend webhook create returns: `{id, url, events, enabled, description, created_at, updated_at, secret}`
- Backend webhook rotate-secret returns: `{id, secret, rotatedAt}`
