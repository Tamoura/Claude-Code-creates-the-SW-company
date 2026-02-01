import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders a button with accessible label', () => {
    render(<ThemeToggle />);

    expect(
      screen.getByRole('button', { name: /toggle theme/i })
    ).toBeInTheDocument();
  });

  it('toggles from light to dark on click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: /toggle theme/i }));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles from dark back to light on double click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);
    await user.click(button);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
