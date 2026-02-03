import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/dashboard/Sidebar';
import TopHeader from '../../components/dashboard/TopHeader';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/create': 'Create Payment Link',
  '/dashboard/payments': 'Payments',
  '/dashboard/invoices': 'Invoices',
  '/dashboard/api-keys': 'API Keys',
  '/dashboard/webhooks': 'Webhooks & Docs',
  '/dashboard/security': 'Security',
  '/dashboard/settings': 'Settings',
  '/dashboard/admin/merchants': 'Merchants',
};

export default function DashboardLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const title = pageTitles[location.pathname]
    || (location.pathname.match(/^\/dashboard\/admin\/merchants\/.+\/payments$/) ? 'Merchant Payments' : null)
    || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-page-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent-blue focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
      >
        Skip to main content
      </a>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-card-bg border border-card-border text-text-primary hover:bg-sidebar-hover md:hidden focus-visible:outline-2 focus-visible:outline-accent-blue focus-visible:outline-offset-2"
        aria-label="Open navigation menu"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 md:ml-56 flex flex-col">
        <TopHeader title={title} />
        <main id="main-content" className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
