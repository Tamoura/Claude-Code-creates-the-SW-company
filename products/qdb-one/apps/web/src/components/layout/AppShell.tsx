'use client';

import { useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import LoginPage from './LoginPage';

interface AppShellProps {
  children: ReactNode;
}

const PUBLIC_ROUTES = ['/', '/login'];

export default function AppShell({ children }: AppShellProps) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Public routes render children directly (no sidebar, no header, no auth gate)
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // All other routes require authentication
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
