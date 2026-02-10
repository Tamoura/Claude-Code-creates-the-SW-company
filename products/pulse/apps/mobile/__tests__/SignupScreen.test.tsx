import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SignupScreen } from '../src/screens/SignupScreen';

// Mock auth store
const mockRegister = jest.fn();
const mockClearError = jest.fn();
jest.mock('../src/store/auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    register: mockRegister,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  })),
}));

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the signup form', () => {
    const { getByTestId, getAllByText } = render(<SignupScreen />);
    expect(getAllByText('Create Account').length).toBeGreaterThanOrEqual(1);
    expect(getByTestId('name-input')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('confirm-password-input')).toBeTruthy();
    expect(getByTestId('signup-button')).toBeTruthy();
  });

  it('renders login link', () => {
    const { getByTestId } = render(<SignupScreen />);
    expect(getByTestId('login-link')).toBeTruthy();
  });

  it('allows entering all fields', () => {
    const { getByTestId } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Jane Smith');
    fireEvent.changeText(
      getByTestId('email-input'),
      'jane@example.com'
    );
    fireEvent.changeText(
      getByTestId('password-input'),
      'SecurePass123!'
    );
    fireEvent.changeText(
      getByTestId('confirm-password-input'),
      'SecurePass123!'
    );

    expect(getByTestId('name-input').props.value).toBe('Jane Smith');
    expect(getByTestId('email-input').props.value).toBe(
      'jane@example.com'
    );
  });

  it('calls register when form is submitted with valid data', () => {
    const { getByTestId } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId('name-input'), 'Jane Smith');
    fireEvent.changeText(
      getByTestId('email-input'),
      'jane@example.com'
    );
    fireEvent.changeText(
      getByTestId('password-input'),
      'SecurePass123!'
    );
    fireEvent.changeText(
      getByTestId('confirm-password-input'),
      'SecurePass123!'
    );
    fireEvent.press(getByTestId('signup-button'));

    expect(mockRegister).toHaveBeenCalledWith({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'SecurePass123!',
    });
  });

  it('shows error banner when error exists', () => {
    const { useAuthStore } = require('../src/store/auth-store');
    (useAuthStore as jest.Mock).mockReturnValue({
      register: mockRegister,
      isLoading: false,
      error: 'Email already registered',
      clearError: mockClearError,
    });

    const { getByTestId, getByText } = render(<SignupScreen />);
    expect(getByTestId('error-banner')).toBeTruthy();
    expect(getByText('Email already registered')).toBeTruthy();
  });

  it('shows loading state on signup button', () => {
    const { useAuthStore } = require('../src/store/auth-store');
    (useAuthStore as jest.Mock).mockReturnValue({
      register: mockRegister,
      isLoading: true,
      error: null,
      clearError: mockClearError,
    });

    const { getByText } = render(<SignupScreen />);
    expect(getByText('Creating account...')).toBeTruthy();
  });
});
