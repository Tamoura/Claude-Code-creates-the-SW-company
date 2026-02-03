/**
 * PublicNav Component
 *
 * Navigation bar for public-facing pages (Home, Pricing, etc.).
 * Includes logo, nav links, and auth buttons.
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function PublicNav() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  const isActive = (path: string) => location.pathname === path;

  // Handle Escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  // Auto-focus first menu item when mobile menu opens
  useEffect(() => {
    if (isMobileMenuOpen && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [isMobileMenuOpen]);

  return (
    <nav className="border-b border-card-border">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">SF</span>
            </div>
            <span className="text-lg font-bold text-text-primary">StableFlow</span>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'text-accent-pink'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Home
            </Link>
            <Link
              to="/pricing"
              className={`text-sm font-medium transition-colors ${
                isActive('/pricing')
                  ? 'text-accent-pink'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Pricing
            </Link>
            <Link
              to="/docs"
              className={`text-sm font-medium transition-colors ${
                location.pathname.startsWith('/docs')
                  ? 'text-accent-pink'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Docs
            </Link>
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-card-border">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-text-secondary border border-card-border rounded-lg hover:text-text-primary hover:border-text-muted transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-text-primary hover:bg-sidebar-hover focus-visible:outline-2 focus-visible:outline-accent-blue focus-visible:outline-offset-2"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3">
            <Link
              ref={firstMenuItemRef}
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/')
                  ? 'bg-accent-pink/10 text-accent-pink'
                  : 'text-text-secondary hover:bg-sidebar-hover hover:text-text-primary'
              }`}
            >
              Home
            </Link>
            <Link
              to="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/pricing')
                  ? 'bg-accent-pink/10 text-accent-pink'
                  : 'text-text-secondary hover:bg-sidebar-hover hover:text-text-primary'
              }`}
            >
              Pricing
            </Link>
            <Link
              to="/docs"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                location.pathname.startsWith('/docs')
                  ? 'bg-accent-pink/10 text-accent-pink'
                  : 'text-text-secondary hover:bg-sidebar-hover hover:text-text-primary'
              }`}
            >
              Docs
            </Link>
            <div className="pt-3 mt-3 border-t border-card-border space-y-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm font-medium text-text-secondary border border-card-border rounded-lg hover:text-text-primary hover:border-text-muted transition-colors text-center"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
