import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/api-client';

interface TopHeaderProps {
  title: string;
}

export default function TopHeader({ title }: TopHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Derive initials from user email
  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : '??';

  async function handleSimulatePayment() {
    setIsCreating(true);
    try {
      const session = await apiClient.createPaymentSession({
        amount: 2500,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        description: 'Quick payment — via header',
        merchant_address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      });
      // Navigate to the payment page
      navigate(`/pay/${session.id}`);
    } catch {
      // Fallback: navigate to dashboard where CheckoutPreview lives
      navigate('/dashboard');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSignOut() {
    setShowMenu(false);
    await logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-page-bg border-b border-card-border">
      <h1 className="text-xl font-bold text-text-primary">{title}</h1>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSimulatePayment}
          disabled={isCreating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
          {isCreating ? 'Creating...' : 'Simulate Payment'}
        </button>

        {/* User avatar with dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-9 h-9 rounded-full bg-accent-blue flex items-center justify-center text-sm font-bold text-white hover:ring-2 hover:ring-accent-blue/50 transition-all cursor-pointer"
          >
            {initials}
          </button>

          {showMenu && (
            <div className="absolute right-0 top-12 w-56 bg-card-bg border border-card-border rounded-xl shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-card-border">
                <p className="text-sm font-medium text-text-primary truncate">{user?.email || 'Not logged in'}</p>
                <p className="text-xs text-text-muted">Merchant Account</p>
              </div>
              <button
                onClick={() => { setShowMenu(false); navigate('/dashboard/settings'); }}
                className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-sidebar-hover hover:text-text-primary transition-colors"
              >
                Settings
              </button>
              <button
                onClick={() => { setShowMenu(false); navigate('/dashboard/security'); }}
                className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-sidebar-hover hover:text-text-primary transition-colors"
              >
                Security
              </button>
              <div className="border-t border-card-border mt-1 pt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
