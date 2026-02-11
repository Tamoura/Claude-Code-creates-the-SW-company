import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../../src/app/dashboard/settings/page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock useAuth hook
const mockLogout = jest.fn();
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}));

// Mock API client
const mockGetProfile = jest.fn();
const mockUpdateProfile = jest.fn();
const mockChangePassword = jest.fn();

jest.mock('../../../src/lib/api-client', () => ({
  apiClient: {
    getProfile: mockGetProfile,
    updateProfile: mockUpdateProfile,
    changePassword: mockChangePassword,
  },
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page header', () => {
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 2,
    });

    render(<SettingsPage />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(
      screen.getByText(/Manage your account and preferences/)
    ).toBeInTheDocument();
  });

  it('shows loading state while fetching profile', () => {
    mockGetProfile.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<SettingsPage />);

    const loadingElements = screen.getAllByLabelText(/loading/i);
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('renders profile form with user data', async () => {
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'premium',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 2,
    });

    render(<SettingsPage />);

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Full Name/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;

      expect(nameInput.value).toBe('John Doe');
      expect(emailInput.value).toBe('john@example.com');
      expect(screen.getByText(/premium plan/i)).toBeInTheDocument();
      expect(screen.getByText(/2 child profiles/i)).toBeInTheDocument();
    });
  });

  it('renders password change form', async () => {
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 0,
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
    });
  });

  it('updates profile when save button is clicked', async () => {
    const user = userEvent.setup();
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 0,
    });
    mockUpdateProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Smith',
      email: 'john.smith@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 0,
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });

    await user.clear(nameInput);
    await user.type(nameInput, 'John Smith');
    await user.clear(emailInput);
    await user.type(emailInput, 'john.smith@example.com');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'John Smith',
        email: 'john.smith@example.com',
      });
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error message when profile update fails', async () => {
    const user = userEvent.setup();
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 0,
    });
    mockUpdateProfile.mockRejectedValue(new Error('Email already in use'));

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email/i);
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });

    await user.clear(emailInput);
    await user.type(emailInput, 'taken@example.com');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
    });
  });

  it('changes password when form is submitted', async () => {
    const user = userEvent.setup();
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 0,
    });
    mockChangePassword.mockResolvedValue({ message: 'Password changed successfully' });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const newPasswordInput = screen.getByLabelText(/New Password/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);
    const changePasswordButton = screen.getByRole('button', {
      name: /Change Password/i,
    });

    await user.type(currentPasswordInput, 'oldPassword123');
    await user.type(newPasswordInput, 'NewPassword123');
    await user.type(confirmPasswordInput, 'NewPassword123');
    await user.click(changePasswordButton);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith(
        'oldPassword123',
        'NewPassword123'
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(
        screen.getByText(/Password changed successfully/i)
      ).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 0,
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const newPasswordInput = screen.getByLabelText(/New Password/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);
    const changePasswordButton = screen.getByRole('button', {
      name: /Change Password/i,
    });

    await user.type(currentPasswordInput, 'oldPassword123');
    await user.type(newPasswordInput, 'NewPassword123');
    await user.type(confirmPasswordInput, 'DifferentPassword123');
    await user.click(changePasswordButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });
  });

  it('has proper password input attributes', async () => {
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 0,
    });

    render(<SettingsPage />);

    await waitFor(() => {
      const currentPasswordInput = screen.getByLabelText(/Current Password/i);
      const newPasswordInput = screen.getByLabelText(/New Password/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);

      expect(currentPasswordInput).toHaveAttribute('type', 'password');
      expect(currentPasswordInput).toHaveAttribute('autoComplete', 'current-password');

      expect(newPasswordInput).toHaveAttribute('type', 'password');
      expect(newPasswordInput).toHaveAttribute('minLength', '8');
      expect(newPasswordInput).toHaveAttribute('autoComplete', 'new-password');

      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('minLength', '8');
      expect(confirmPasswordInput).toHaveAttribute('autoComplete', 'new-password');
    });
  });

  it('renders sign out button', async () => {
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 0,
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Account Actions/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
    });
  });

  it('calls logout and redirects when sign out is clicked', async () => {
    const user = userEvent.setup();
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 0,
    });
    mockLogout.mockResolvedValue(undefined);

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
    });

    const signOutButton = screen.getByRole('button', { name: /Sign Out/i });
    await user.click(signOutButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('displays subscription tier correctly', async () => {
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 1,
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/free plan/i)).toBeInTheDocument();
    });
  });

  it('displays child count correctly with singular form', async () => {
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      subscriptionTier: 'free',
      createdAt: '2024-01-01T00:00:00Z',
      childCount: 1,
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/1 child profile$/i)).toBeInTheDocument();
    });
  });
});
