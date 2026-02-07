# Pulse Mobile App (MOBILE-01)

## Task
Build React Native mobile app for Pulse in `products/pulse/apps/mobile/`

## Key Decisions
- Expo managed workflow with TypeScript
- React Navigation for navigation (stack + tabs)
- Zustand for state management
- expo-secure-store for JWT storage
- expo-notifications for push notifications
- React Query for API data fetching/caching
- WebSocket for real-time activity feed

## API Endpoints (port 5003)
- POST /api/v1/auth/login
- POST /api/v1/auth/register
- GET /api/v1/risk/current?teamId=X
- GET /api/v1/risk/history?teamId=X&days=30
- GET /api/v1/metrics/velocity?teamId=X&range=30d
- GET /api/v1/metrics/coverage?teamId=X&range=30d
- GET /api/v1/metrics/summary?teamId=X
- GET /api/v1/repos?teamId=X
- WebSocket: ws://localhost:5003 (JWT auth)

## Screens
- LoginScreen, SignupScreen (auth stack)
- ActivityScreen (real-time feed via WebSocket)
- RiskScreen, RiskDetailScreen (sprint risk)
- SettingsScreen (profile, notifications, logout)

## Progress
- [x] Notes file created
- [ ] Expo project initialized
- [ ] Navigation structure
- [ ] Auth flow
- [ ] Activity feed
- [ ] Risk dashboard
- [ ] Settings screen
- [ ] Push notifications
- [ ] Tests
