import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import i18n from './i18n/i18n';

describe('App', () => {
  beforeEach(() => {
    // Reset to English before each test
    i18n.changeLanguage('en');
  });

  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    // Wait for i18n to be ready and check for translated header
    expect(screen.getByText(/quantum use cases/i)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    // Check for navigation links by role
    const navLinks = screen.getAllByRole('link');
    const navTexts = navLinks.map(link => link.textContent);
    expect(navTexts.some(text => text?.match(/browse/i))).toBe(true);
    expect(navTexts.some(text => text?.match(/compare/i))).toBe(true);
    expect(navTexts.some(text => text?.match(/learning path/i))).toBe(true);
    expect(navTexts.some(text => text?.match(/arab sovereignty/i))).toBe(true);
  });
});
