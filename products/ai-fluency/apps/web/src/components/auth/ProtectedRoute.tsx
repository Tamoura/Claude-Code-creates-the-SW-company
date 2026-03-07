'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/index';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      void router.push('/login');
      return;
    }
    if (requiredRole && user?.role !== requiredRole) {
      void router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, requiredRole, user, router]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
            aria-hidden="true"
          />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
