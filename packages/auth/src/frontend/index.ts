// Hooks
export { useAuth } from './hooks/useAuth.js';
export type { AuthUser } from './hooks/useAuth.js';

// Components
export { default as ProtectedRoute } from './components/ProtectedRoute.js';

// Lib
export { TokenManager } from './lib/token-manager.js';
export { createAuthApiClient } from './lib/api-client.js';
export type { User, LoginResponse, AuthApiClientOptions } from './lib/api-client.js';
