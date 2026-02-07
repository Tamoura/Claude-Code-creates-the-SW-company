'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { TokenManager } from '../../lib/token-manager';
import { useAuth } from '../../hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  };

  useEffect(() => {
    if (!TokenManager.hasToken()) {
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />
      <div className="md:ml-56">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main id="main-content" className="p-6" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
