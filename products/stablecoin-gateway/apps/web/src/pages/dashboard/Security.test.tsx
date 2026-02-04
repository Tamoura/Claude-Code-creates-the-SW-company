import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Security from './Security';
import * as useAuthModule from '../../hooks/useAuth';
import * as useSessionsModule from '../../hooks/useSessions';
import { apiClient } from '../../lib/api-client';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth');

// Mock the useSessions hook
vi.mock('../../hooks/useSessions');

// Mock the apiClient
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    changePassword: vi.fn(),
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Security Page', () => {
  const mockUser = {
    id: 'usr_123',
    email: 'merchant@test.com',
    role: 'MERCHANT' as const,
  };

  const mockLogout = vi.fn();
  const mockRevokeSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: mockLogout,
    });

    // Mock useSessions hook
    vi.spyOn(useSessionsModule, 'useSessions').mockReturnValue({
      sessions: [
        { id: 's1', created_at: '2026-01-01T00:00:00Z', expires_at: '2026-01-08T00:00:00Z' },
        { id: 's2', created_at: '2026-01-02T00:00:00Z', expires_at: '2026-01-09T00:00:00Z' },
      ],
      isLoading: false,
      error: null,
      revokeSession: mockRevokeSession,
      refresh: vi.fn(),
    });
  });

  describe('Account Information', () => {
    it('renders account section with user email', () => {
      renderWithRouter(<Security />);

      expect(screen.getByText('Account')).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    it('shows change password button', () => {
      renderWithRouter(<Security />);

      expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
    });
  });

  describe('Change Password Form', () => {
    it('shows password form when change password is clicked', () => {
      renderWithRouter(<Security />);

      const changeButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changeButton);

      expect(screen.getByLabelText('Current password')).toBeInTheDocument();
      expect(screen.getByLabelText(/new password \(min 12 chars\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    });

    it('hides password form when cancel is clicked', () => {
      renderWithRouter(<Security />);

      const changeButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changeButton);
      expect(screen.getByLabelText('Current password')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
    });

    it('shows validation error for mismatched passwords', async () => {
      renderWithRouter(<Security />);

      const changeButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changeButton);

      const currentPassword = screen.getByLabelText('Current password');
      const newPassword = screen.getByLabelText(/new password \(min 12 chars\)/i);
      const confirmPassword = screen.getByLabelText('Confirm new password');
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(currentPassword, { target: { value: 'OldPassword123!' } });
      fireEvent.change(newPassword, { target: { value: 'NewPassword123!' } });
      fireEvent.change(confirmPassword, { target: { value: 'DifferentPass123!' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for short password', async () => {
      renderWithRouter(<Security />);

      const changeButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changeButton);

      const currentPassword = screen.getByLabelText('Current password');
      const newPassword = screen.getByLabelText(/new password \(min 12 chars\)/i);
      const confirmPassword = screen.getByLabelText('Confirm new password');
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(currentPassword, { target: { value: 'oldpass' } });
      fireEvent.change(newPassword, { target: { value: 'short' } });
      fireEvent.change(confirmPassword, { target: { value: 'short' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 12 characters/i)).toBeInTheDocument();
      });
    });

    it('shows success message when password is changed successfully', async () => {
      vi.mocked(apiClient.changePassword).mockResolvedValueOnce(undefined);

      renderWithRouter(<Security />);

      const changeButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changeButton);

      const currentPassword = screen.getByLabelText('Current password');
      const newPassword = screen.getByLabelText(/new password \(min 12 chars\)/i);
      const confirmPassword = screen.getByLabelText('Confirm new password');
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(currentPassword, { target: { value: 'OldPassword123!' } });
      fireEvent.change(newPassword, { target: { value: 'NewPassword123!' } });
      fireEvent.change(confirmPassword, { target: { value: 'NewPassword123!' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
      });

      // Form should be hidden after success
      expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
    });

    it('shows error message when API call fails', async () => {
      vi.mocked(apiClient.changePassword).mockRejectedValueOnce(new Error('API Error'));

      renderWithRouter(<Security />);

      const changeButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changeButton);

      const currentPassword = screen.getByLabelText('Current password');
      const newPassword = screen.getByLabelText(/new password \(min 12 chars\)/i);
      const confirmPassword = screen.getByLabelText('Confirm new password');
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(currentPassword, { target: { value: 'OldPassword123!' } });
      fireEvent.change(newPassword, { target: { value: 'NewPassword123!' } });
      fireEvent.change(confirmPassword, { target: { value: 'NewPassword123!' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to change password/i)).toBeInTheDocument();
      });
    });

    it('disables submit button during password change', async () => {
      vi.mocked(apiClient.changePassword).mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      renderWithRouter(<Security />);

      const changeButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changeButton);

      const currentPassword = screen.getByLabelText('Current password');
      const newPassword = screen.getByLabelText(/new password \(min 12 chars\)/i);
      const confirmPassword = screen.getByLabelText('Confirm new password');
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(currentPassword, { target: { value: 'OldPassword123!' } });
      fireEvent.change(newPassword, { target: { value: 'NewPassword123!' } });
      fireEvent.change(confirmPassword, { target: { value: 'NewPassword123!' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /changing.../i })).toBeDisabled();
      });
    });
  });

  describe('Active Sessions', () => {
    it('renders active sessions section', () => {
      renderWithRouter(<Security />);

      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show sessions/i })).toBeInTheDocument();
    });

    it('shows sessions when show button is clicked', () => {
      renderWithRouter(<Security />);

      const showButton = screen.getByRole('button', { name: /show sessions/i });
      fireEvent.click(showButton);

      expect(screen.getByText('Session 1')).toBeInTheDocument();
      expect(screen.getByText('Session 2')).toBeInTheDocument();
    });

    it('hides sessions when hide button is clicked', () => {
      renderWithRouter(<Security />);

      const showButton = screen.getByRole('button', { name: /show sessions/i });
      fireEvent.click(showButton);
      expect(screen.getByText('Session 1')).toBeInTheDocument();

      const hideButton = screen.getByRole('button', { name: /hide sessions/i });
      fireEvent.click(hideButton);
      expect(screen.queryByText('Session 1')).not.toBeInTheDocument();
    });
  });

  describe('Danger Zone', () => {
    it('renders danger zone with sign out button', () => {
      renderWithRouter(<Security />);

      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('calls logout when sign out is clicked', async () => {
      mockLogout.mockResolvedValueOnce(undefined);

      renderWithRouter(<Security />);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });
});
