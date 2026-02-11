import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../../src/app/login/page';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

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
const mockLogin = jest.fn();
jest.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoading: false,
    error: null,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the login form with all fields', () => {
    render(<LoginPage />);

    // Header
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(
      screen.getByText(/Log in to continue tracking your child/)
    ).toBeInTheDocument();

    // Form fields
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();

    // Buttons and links
    expect(screen.getByRole('button', { name: /Log In/i })).toBeInTheDocument();
    expect(screen.getByText(/Forgot password/i)).toBeInTheDocument();
  });

  it('renders links to signup and forgot-password pages', () => {
    render(<LoginPage />);

    const signupLink = screen.getByText(/Sign up free/i);
    expect(signupLink.closest('a')).toHaveAttribute('href', '/signup');

    const forgotPasswordLink = screen.getByText(/Forgot password/i);
    expect(forgotPasswordLink.closest('a')).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });

  it('has proper input types and attributes', () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');

    const passwordInput = screen.getByLabelText(/Password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
  });

  it('updates input values when user types', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(
      /Email Address/i
    ) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('calls login handler on form submission', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ user: { id: '1', email: 'test@example.com', name: 'Test' } });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Log In/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message when login fails', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Log In/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Log In/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Button should show loading text and be disabled
    await waitFor(() => {
      expect(screen.getByText(/Logging in.../i)).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  it('prevents empty form submission', () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    // HTML5 validation should prevent submission
    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });
});
