import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupPage from '../../src/app/signup/page';

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
const mockSignup = jest.fn();
jest.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    signup: mockSignup,
    isLoading: false,
    error: null,
  }),
}));

describe('SignupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the signup form with all fields', () => {
    render(<SignupPage />);

    // Header
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(
      screen.getByText(/Start tracking your child/)
    ).toBeInTheDocument();

    // Form fields
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();

    // Buttons
    expect(
      screen.getByRole('button', { name: /Create Account/i })
    ).toBeInTheDocument();
  });

  it('renders link to login page', () => {
    render(<SignupPage />);

    const loginLinks = screen.getAllByText(/Log in/i);
    const formLink = loginLinks.find((el) => el.closest('a')?.getAttribute('href') === '/login');
    expect(formLink).toBeTruthy();
  });

  it('has proper input types and attributes', () => {
    render(<SignupPage />);

    const nameInput = screen.getByLabelText(/Full Name/i);
    expect(nameInput).toHaveAttribute('type', 'text');
    expect(nameInput).toHaveAttribute('required');
    expect(nameInput).toHaveAttribute('autoComplete', 'name');

    const emailInput = screen.getByLabelText(/Email Address/i);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');

    const passwordInput = screen.getByLabelText(/Password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('minLength', '8');
    expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
  });

  it('shows password requirements in placeholder', () => {
    render(<SignupPage />);

    const passwordInput = screen.getByLabelText(/Password/i);
    expect(passwordInput).toHaveAttribute(
      'placeholder',
      'Min 8 characters, 1 uppercase, 1 number'
    );
  });

  it('updates input values when user types', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    const nameInput = screen.getByLabelText(/Full Name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(
      /Email Address/i
    ) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'Password123');

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john@example.com');
    expect(passwordInput.value).toBe('Password123');
  });

  it('calls signup handler on form submission', async () => {
    const user = userEvent.setup();
    mockSignup.mockResolvedValue({
      user: { id: '1', email: 'john@example.com', name: 'John Doe' },
    });

    render(<SignupPage />);

    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Create Account/i });

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith(
        'John Doe',
        'john@example.com',
        'Password123'
      );
      expect(mockPush).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('displays error message when signup fails', async () => {
    const user = userEvent.setup();
    mockSignup.mockRejectedValue(new Error('Email already in use'));

    render(<SignupPage />);

    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Create Account/i });

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockSignup.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<SignupPage />);

    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Create Account/i });

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(submitButton);

    // Button should show loading text and be disabled
    await waitFor(() => {
      expect(screen.getByText(/Creating Account.../i)).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  it('prevents empty form submission', () => {
    render(<SignupPage />);

    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    // HTML5 validation should prevent submission
    expect(nameInput).toBeRequired();
    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });
});
