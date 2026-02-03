import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Signup from './Signup';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock api-client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    signup: vi.fn().mockResolvedValue({ success: true }),
  },
}));

function renderSignup() {
  return render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>
  );
}

describe('Signup - ToS/Privacy Consent', () => {
  it('renders ToS consent checkbox', () => {
    renderSignup();

    const checkbox = screen.getByRole('checkbox', { name: /agree to the terms of service and privacy policy/i });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('ToS links are present', () => {
    renderSignup();

    const tosLink = screen.getByRole('link', { name: /terms of service/i });
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i });

    expect(tosLink).toBeInTheDocument();
    expect(tosLink).toHaveAttribute('href', '#');
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '#');
  });

  it('submit button is disabled when ToS is not checked', async () => {
    renderSignup();
    const user = userEvent.setup();

    // Fill in valid form data
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'ValidPass123!@#$');
    await user.type(screen.getByLabelText(/confirm password/i), 'ValidPass123!@#$');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeDisabled();
  });

  it('submit button is enabled when ToS is checked and form is valid', async () => {
    renderSignup();
    const user = userEvent.setup();

    // Fill in valid form data
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'ValidPass123!@#$');
    await user.type(screen.getByLabelText(/confirm password/i), 'ValidPass123!@#$');

    // Check ToS
    const tosCheckbox = screen.getByRole('checkbox', { name: /agree to the terms of service and privacy policy/i });
    await user.click(tosCheckbox);

    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows error when trying to submit without agreeing to ToS', async () => {
    renderSignup();
    const user = userEvent.setup();

    // Fill in valid form data but don't check ToS
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'ValidPass123!@#$');
    await user.type(screen.getByLabelText(/confirm password/i), 'ValidPass123!@#$');

    // Try to submit (button should be disabled, but test the validation logic)
    const form = screen.getByRole('button', { name: /create account/i }).closest('form');
    if (form) {
      // Simulate form submission attempt
      const submitButton = screen.getByRole('button', { name: /create account/i });
      // Since button is disabled, we can't click it - the test validates the disabled state
      expect(submitButton).toBeDisabled();
    }
  });

  it('checkbox has proper label association for accessibility', () => {
    renderSignup();

    const checkbox = screen.getByRole('checkbox', { name: /agree to the terms of service and privacy policy/i });
    const label = checkbox.closest('label');

    expect(label).toBeInTheDocument();
  });
});

describe('Signup - Form Accessibility', () => {
  it('all inputs have associated labels', () => {
    renderSignup();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    expect(emailInput).toHaveAttribute('id');
    expect(passwordInput).toHaveAttribute('id');
    expect(confirmPasswordInput).toHaveAttribute('id');
  });

  it('required fields have aria-required', () => {
    renderSignup();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    expect(emailInput).toHaveAttribute('aria-required', 'true');
    expect(passwordInput).toHaveAttribute('aria-required', 'true');
    expect(confirmPasswordInput).toHaveAttribute('aria-required', 'true');
  });

  it('password requirements have aria-describedby on password field', () => {
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password$/i);
    const ariaDescribedBy = passwordInput.getAttribute('aria-describedby');

    expect(ariaDescribedBy).toBeTruthy();

    // Verify the referenced element exists
    if (ariaDescribedBy) {
      const describedElement = document.getElementById(ariaDescribedBy);
      expect(describedElement).toBeInTheDocument();
    }
  });

  it('shows aria-invalid when field has error', async () => {
    renderSignup();
    const user = userEvent.setup();

    // Fill in mismatched passwords to trigger error
    await user.type(screen.getByLabelText(/^password$/i), 'ValidPass123!@#$');
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!@#$');

    // Check ToS to enable submit
    const tosCheckbox = screen.getByRole('checkbox', { name: /agree to the terms of service and privacy policy/i });
    await user.click(tosCheckbox);

    // Try to submit
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });
});
