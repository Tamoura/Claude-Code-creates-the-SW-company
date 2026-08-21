// Re-export everything from backend and frontend sub-packages.
// For tree-shaking, prefer importing from '@connectsw/auth/backend' or '@connectsw/auth/frontend'.
export * from './backend/index.js';
export * from './frontend/index.js';
