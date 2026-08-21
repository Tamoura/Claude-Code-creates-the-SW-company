import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import type { NavSection } from './Sidebar.js';
import Sidebar from './Sidebar.js';

export interface DashboardLayoutProps {
  /** Product brand element for the sidebar */
  brand: ReactNode;
  /** Navigation sections */
  sections: NavSection[];
  /** Page title (shown in header) */
  title?: string;
  /** Sidebar footer content */
  sidebarFooter?: ReactNode;
  /** Header right content (e.g., user menu) */
  headerRight?: ReactNode;
  /** Sidebar width class. Default: 'w-56' */
  sidebarWidth?: string;
  /** Active link class override */
  activeLinkClass?: string;
  /** Children override (defaults to Outlet) */
  children?: ReactNode;
}

export default function DashboardLayout({
  brand,
  sections,
  title,
  sidebarFooter,
  headerRight,
  sidebarWidth = 'w-56',
  activeLinkClass,
  children,
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Compute margin-left from width class
  const mlClass = sidebarWidth.replace('w-', 'md:ml-');

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Mobile hamburger */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
        aria-label="Open navigation menu"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <Sidebar
        brand={brand}
        sections={sections}
        footer={sidebarFooter}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        widthClass={sidebarWidth}
        activeLinkClass={activeLinkClass}
      />

      <div className={`flex-1 ${mlClass} flex flex-col`}>
        {/* Header */}
        {(title || headerRight) && (
          <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
              {headerRight}
            </div>
          </header>
        )}

        <main id="main-content" className="flex-1 p-4 md:p-8">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
