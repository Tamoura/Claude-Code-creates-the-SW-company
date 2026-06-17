'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { AppShell } from '@/components/app/AppShell';
import { LoadingState } from '@/components/ui/feedback';

function Guard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    // Redirecting — render nothing to avoid a flash of protected content.
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState label="Redirecting to sign in…" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <Guard>{children}</Guard>
    </AuthProvider>
  );
}
