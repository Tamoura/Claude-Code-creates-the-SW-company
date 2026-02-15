'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/mobile/BottomNav';
import { ReactNode, useEffect } from 'react';

const PUBLIC_MOBILE_ROUTES = ['/m', '/m/login'];

export default function MobileLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = PUBLIC_MOBILE_ROUTES.includes(pathname);

  useEffect(() => {
    if (!isPublicRoute && !isAuthenticated) {
      router.replace('/m/login');
    }
  }, [isPublicRoute, isAuthenticated, router]);

  // Public routes: no bottom nav
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Auth-gated routes: show bottom nav
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
