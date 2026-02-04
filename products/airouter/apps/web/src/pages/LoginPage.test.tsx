import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

function renderWithRouter() {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
}

describe('LoginPage', () => {
  it('renders the welcome heading', () => {
    renderWithRouter();

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('renders email input field', () => {
    renderWithRouter();

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('renders password input field', () => {
    renderWithRouter();

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('renders the sign in button', () => {
    renderWithRouter();

    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('renders link to sign up page', () => {
    renderWithRouter();

    expect(screen.getByText('Sign up')).toBeInTheDocument();
  });

  it('renders the AIRouter logo', () => {
    renderWithRouter();

    expect(screen.getByText('AIRouter')).toBeInTheDocument();
  });
});
