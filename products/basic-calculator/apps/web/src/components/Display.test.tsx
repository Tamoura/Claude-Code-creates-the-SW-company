import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Display } from './Display';

describe('Display', () => {
  it('should render display value', () => {
    render(<Display value="42" />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should have aria-live region for screen readers', () => {
    render(<Display value="123" />);
    const display = screen.getByRole('status');
    expect(display).toHaveAttribute('aria-live', 'polite');
  });

  it('should be atomic for screen readers', () => {
    render(<Display value="123" />);
    const display = screen.getByRole('status');
    expect(display).toHaveAttribute('aria-atomic', 'true');
  });

  it('should have accessible label', () => {
    render(<Display value="123" />);
    const display = screen.getByRole('status');
    expect(display).toHaveAttribute('aria-label', 'Calculator display');
  });

  it('should display zero by default when empty', () => {
    render(<Display value="" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should display error messages', () => {
    render(<Display value="Error: Cannot divide by zero" error />);
    expect(screen.getByText('Error: Cannot divide by zero')).toBeInTheDocument();
  });

  it('should have error styling when error prop is true', () => {
    render(<Display value="Error" error />);
    const display = screen.getByRole('status');
    expect(display).toHaveClass('text-red-400');
  });

  it('should have data-testid for E2E testing', () => {
    render(<Display value="42" />);
    expect(screen.getByTestId('calculator-display')).toBeInTheDocument();
  });
});
