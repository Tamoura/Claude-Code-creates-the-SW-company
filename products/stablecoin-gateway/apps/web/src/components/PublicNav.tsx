/**
 * PublicNav Component
 *
 * Navigation bar for public-facing pages (Home, Pricing, etc.).
 * Includes logo, nav links, and auth buttons.
 */

import { useNavigate, useLocation } from 'react-router-dom';

export default function PublicNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b border-card-border">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">SF</span>
          </div>
          <span className="text-lg font-bold text-text-primary">StableFlow</span>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/')}
            className={`text-sm font-medium transition-colors ${
              isActive('/')
                ? 'text-accent-pink'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => navigate('/pricing')}
            className={`text-sm font-medium transition-colors ${
              isActive('/pricing')
                ? 'text-accent-pink'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Pricing
          </button>
          <button
            onClick={() => navigate('/docs')}
            className={`text-sm font-medium transition-colors ${
              location.pathname.startsWith('/docs')
                ? 'text-accent-pink'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Docs
          </button>
          <div className="flex items-center gap-3 ml-4 pl-4 border-l border-card-border">
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
      </div>
    </nav>
  );
}
