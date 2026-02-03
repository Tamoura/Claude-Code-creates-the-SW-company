import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../../src/components/dashboard/Sidebar';

// Mock useAuth to control role
const mockUseAuth = vi.fn();
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useTheme used by ThemeToggle
vi.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  describe('Admin nav section', () => {
    it('should show Admin section and Merchants link for ADMIN role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'admin@test.com', role: 'ADMIN' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      renderSidebar();

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Merchants')).toBeInTheDocument();
    });

    it('should hide Admin section for MERCHANT role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '2', email: 'merchant@test.com', role: 'MERCHANT' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      renderSidebar();

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Merchants')).not.toBeInTheDocument();
    });

    it('should hide Admin section when user has no role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '3', email: 'user@test.com' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      renderSidebar();

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Merchants')).not.toBeInTheDocument();
    });

    it('should hide Admin section when user is null', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      renderSidebar();

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Merchants')).not.toBeInTheDocument();
    });
  });

  describe('Common nav sections', () => {
    it('should always show main nav items regardless of role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '2', email: 'merchant@test.com', role: 'MERCHANT' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      renderSidebar();

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Payments')).toBeInTheDocument();
      expect(screen.getByText('Invoices')).toBeInTheDocument();
      expect(screen.getByText('Developers')).toBeInTheDocument();
      expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
    });
  });
});
