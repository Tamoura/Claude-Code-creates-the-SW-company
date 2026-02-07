'use client';

import { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:ml-56">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main id="main-content" className="p-6" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
