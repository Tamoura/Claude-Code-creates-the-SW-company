/**
 * ProtectedRoute
 *
 * Auth guard that redirects unauthenticated users to /login.
 * Checks for an existing token via TokenManager.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { TokenManager } from '../lib/token-manager';

export default function ProtectedRoute() {
  if (!TokenManager.hasToken()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
