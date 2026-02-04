import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from './Settings';
import * as useAuthModule from '../../hooks/useAuth';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth');

describe('Settings Page', () => {
  const mockUser = {
    id: 'usr_123',
    email: 'merchant@test.com',
    role: 'MERCHANT' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  describe('Account Information', () => {
    it('renders account info with email', () => {
      render(<Settings />);

      expect(screen.getByText('Account Information')).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
      expect(screen.getByText('MERCHANT')).toBeInTheDocument();
    });

    it('displays member since date', () => {
      render(<Settings />);

      expect(screen.getByText(/member since/i)).toBeInTheDocument();
    });
  });

  describe('Email Notifications', () => {
    it('renders notification toggles with correct defaults', () => {
      render(<Settings />);

      expect(screen.getByText('Email Notifications')).toBeInTheDocument();

      // Check toggle labels
      expect(screen.getByText(/payment received/i)).toBeInTheDocument();
      expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
      expect(screen.getByText(/refund processed/i)).toBeInTheDocument();
      expect(screen.getByText(/weekly summary/i)).toBeInTheDocument();

      // Check defaults (3 on, 1 off)
      const toggles = screen.getAllByRole('checkbox');
      expect(toggles[0]).toBeChecked(); // Payment received
      expect(toggles[1]).toBeChecked(); // Payment failed
      expect(toggles[2]).toBeChecked(); // Refund processed
      expect(toggles[3]).not.toBeChecked(); // Weekly summary
    });

    it('allows toggling notification preferences', () => {
      render(<Settings />);

      const toggles = screen.getAllByRole('checkbox');
      const weeklyToggle = toggles[3];

      expect(weeklyToggle).not.toBeChecked();
      fireEvent.click(weeklyToggle);
      expect(weeklyToggle).toBeChecked();
    });

    it('shows success message when saving preferences', async () => {
      render(<Settings />);

      const saveButton = screen.getByRole('button', { name: /save preferences/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/preferences saved successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Change Password', () => {
    it('renders password change form', () => {
      render(<Settings />);

      expect(screen.getByText('Change Password')).toBeInTheDocument();
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('shows validation error for mismatched passwords', () => {
      render(<Settings />);

      const currentPassword = screen.getByLabelText(/current password/i);
      const newPassword = screen.getByLabelText(/new password/i);
      const confirmPassword = screen.getByLabelText(/confirm password/i);
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(currentPassword, { target: { value: 'OldP@ss123!' } });
      fireEvent.change(newPassword, { target: { value: 'StrongP@ss123456' } });
      fireEvent.change(confirmPassword, { target: { value: 'DifferentP@ss123' } });
      fireEvent.click(updateButton);

      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it('shows validation error for weak password', async () => {
      render(<Settings />);

      const currentPassword = screen.getByLabelText(/current password/i);
      const newPassword = screen.getByLabelText(/new password/i);
      const confirmPassword = screen.getByLabelText(/confirm password/i);
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(currentPassword, { target: { value: 'oldpass' } });
      fireEvent.change(newPassword, { target: { value: 'weak' } });
      fireEvent.change(confirmPassword, { target: { value: 'weak' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 12 characters/i)).toBeInTheDocument();
      });
    });

    it('validates password requirements (uppercase, lowercase, number, special)', async () => {
      render(<Settings />);

      const currentPassword = screen.getByLabelText(/current password/i);
      const newPassword = screen.getByLabelText(/new password/i);
      const confirmPassword = screen.getByLabelText(/confirm password/i);
      const updateButton = screen.getByRole('button', { name: /update password/i });

      // Missing special character
      fireEvent.change(currentPassword, { target: { value: 'oldpass' } });
      fireEvent.change(newPassword, { target: { value: 'NoSpecialChar1' } });
      fireEvent.change(confirmPassword, { target: { value: 'NoSpecialChar1' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/must contain.*special character/i)).toBeInTheDocument();
      });
    });

    it('shows success message when password is updated', async () => {
      render(<Settings />);

      const currentPassword = screen.getByLabelText(/current password/i);
      const newPassword = screen.getByLabelText(/new password/i);
      const confirmPassword = screen.getByLabelText(/confirm password/i);
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(currentPassword, { target: { value: 'OldP@ssword123!' } });
      fireEvent.change(newPassword, { target: { value: 'NewP@ssword123!' } });
      fireEvent.change(confirmPassword, { target: { value: 'NewP@ssword123!' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Danger Zone', () => {
    it('renders delete account section', () => {
      render(<Settings />);

      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      expect(screen.getByText(/permanently delete your account/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
    });

    it('shows confirmation dialog when delete is clicked', () => {
      render(<Settings />);

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      fireEvent.click(deleteButton);

      expect(screen.getByText(/type/i)).toBeInTheDocument();
      expect(screen.getByText(/DELETE/)).toBeInTheDocument();
      expect(screen.getByText(/to confirm/i)).toBeInTheDocument();
    });

    it('requires exact DELETE text to confirm deletion', async () => {
      render(<Settings />);

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /confirm deletion/i })).toBeDisabled();
      });

      const confirmInput = screen.getByRole('textbox', { name: /confirmation text/i });
      fireEvent.change(confirmInput, { target: { value: 'delete' } });

      expect(screen.getByRole('button', { name: /confirm deletion/i })).toBeDisabled();

      fireEvent.change(confirmInput, { target: { value: 'DELETE' } });
      expect(screen.getByRole('button', { name: /confirm deletion/i })).toBeEnabled();
    });
  });
});
