'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TokenManager } from '../../../lib/token-manager';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      TokenManager.setToken(token);
      router.replace('/dashboard');
    } else {
      router.replace('/login?error=auth_failed');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">Signing you in...</p>
      </div>
    </div>
  );
}
