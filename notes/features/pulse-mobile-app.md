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
- [x] Expo project initialized (SDK 54, blank-typescript)
- [x] Navigation structure (AuthStack + MainTabs + RootNavigator)
- [x] Auth flow (Zustand store, secure token storage, login/signup)
- [x] Activity feed (WebSocket hook, real-time FlatList, event icons)
- [x] Risk dashboard (React Query, RiskGauge, FactorBar)
- [x] Settings screen (profile, notification toggles, logout)
- [x] Push notifications (expo-notifications registration hook)
- [x] Tests (67/67 passing across 11 test suites)
- [x] TypeScript strict mode - zero errors

## Technical Notes
- Jest 29 required (Jest 30 incompatible with jest-expo 54)
- Expo SDK 54 notification handler requires shouldShowBanner/shouldShowList
- React 19.1.0 + React Native 0.81.5 (new architecture enabled)
- Used --legacy-peer-deps for @testing-library/react-native install
