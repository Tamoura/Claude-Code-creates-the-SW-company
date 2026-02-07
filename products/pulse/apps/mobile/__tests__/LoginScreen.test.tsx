import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoginScreen } from '../src/screens/LoginScreen';

// Mock auth store
const mockLogin = jest.fn();
const mockClearError = jest.fn();
jest.mock('../src/store/auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    login: mockLogin,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  })),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the login form', () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    expect(getByText('Pulse')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('login-button')).toBeTruthy();
  });

  it('renders sign up link', () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId('signup-link')).toBeTruthy();
  });

  it('allows entering email and password', () => {
    const { getByTestId } = render(<LoginScreen />);
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });

  it('calls login when form is submitted', () => {
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByTestId('login-button'));

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('shows error banner when error exists', () => {
    const { useAuthStore } = require('../src/store/auth-store');
    (useAuthStore as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: 'Invalid credentials',
      clearError: mockClearError,
    });

    const { getByTestId, getByText } = render(<LoginScreen />);
    expect(getByTestId('error-banner')).toBeTruthy();
    expect(getByText('Invalid credentials')).toBeTruthy();
  });

  it('shows loading state on login button', () => {
    const { useAuthStore } = require('../src/store/auth-store');
    (useAuthStore as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
      clearError: mockClearError,
    });

    const { getByText } = render(<LoginScreen />);
    expect(getByText('Signing in...')).toBeTruthy();
  });
});
