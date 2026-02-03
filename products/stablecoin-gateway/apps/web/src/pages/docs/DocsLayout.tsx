/**
 * Documentation Layout
 *
 * Shared layout for all documentation pages with sidebar navigation.
 */

import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function DocsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navLinks = [
    { path: '/docs/quickstart', label: 'Quick Start', icon: '🚀' },
    { path: '/docs/api-reference', label: 'API Reference', icon: '📖' },
    { path: '/docs/webhooks', label: 'Webhooks', icon: '🔔' },
    { path: '/docs/sdk', label: 'SDK', icon: '📦' },
  ];

  return (
    <div className="min-h-screen bg-page-bg text-text-primary">
      {/* Top Navigation Bar */}
      <nav className="border-b border-card-border bg-card-bg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">SF</span>
              </div>
              <span className="text-lg font-bold text-text-primary">StableFlow</span>
            </Link>
            <div className="hidden md:flex items-center gap-4 ml-8">
              <Link
                to="/"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Home
              </Link>
              <Link
                to="/pricing"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/docs"
                className="text-sm font-medium text-accent-blue"
              >
                Docs
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-text-secondary hover:text-text-primary"
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-text-secondary border border-card-border rounded-lg hover:text-text-primary hover:border-text-muted transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar Navigation */}
        <aside
          className={`
            ${sidebarOpen ? 'block' : 'hidden'} md:block
            w-64 flex-shrink-0
            fixed md:static top-[73px] left-0 right-0
            bg-card-bg md:bg-transparent
            border-b md:border-0 border-card-border
            p-6 md:p-0
            z-40
          `}
        >
          <nav className="space-y-1">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Documentation
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === link.path
                    ? 'bg-pink-500/10 text-accent-pink'
                    : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-hover'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main
          className="flex-1 min-w-0"
          data-testid="docs-content"
        >
          <div className="max-w-3xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-card-border mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-text-muted">
          <span>StableFlow — Stablecoin Payment Infrastructure</span>
          <span>Polygon · Ethereum · USDC · USDT</span>
        </div>
      </footer>
    </div>
  );
}
