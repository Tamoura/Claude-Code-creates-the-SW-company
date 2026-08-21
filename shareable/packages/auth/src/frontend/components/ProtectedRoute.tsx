import { Navigate, Outlet } from 'react-router-dom';
import { TokenManager } from '../lib/token-manager.js';

interface ProtectedRouteProps {
  /** Redirect path when not authenticated. Default: '/login' */
  loginPath?: string;
}

export default function ProtectedRoute({ loginPath = '/login' }: ProtectedRouteProps) {
  if (!TokenManager.hasToken()) {
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
}
