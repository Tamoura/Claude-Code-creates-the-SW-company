import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import i18n from '../../i18n/i18n';

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    // Reset to English and clear localStorage
    i18n.changeLanguage('en');
    localStorage.clear();
  });

  it('should render language switcher button', () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button', { name: /language/i });
    expect(button).toBeInTheDocument();
  });

  it('should display current language', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText(/english/i)).toBeInTheDocument();
  });

  it('should show language options when clicked', () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button', { name: /language/i });

    fireEvent.click(button);

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(2);
    expect(screen.getByText(/العربية/i)).toBeInTheDocument();
  });

  it('should switch to Arabic when Arabic is selected', async () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button', { name: /language/i });

    fireEvent.click(button);
    const arabicOption = screen.getByText(/العربية/i);
    fireEvent.click(arabicOption);

    expect(i18n.language).toBe('ar');
  });

  it('should persist language choice in localStorage', async () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button', { name: /language/i });

    fireEvent.click(button);
    const arabicOption = screen.getByText(/العربية/i);
    fireEvent.click(arabicOption);

    expect(localStorage.getItem('i18nextLng')).toBe('ar');
  });

  it('should update document dir attribute when switching to Arabic', async () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button', { name: /language/i });

    fireEvent.click(button);
    const arabicOption = screen.getByText(/العربية/i);
    fireEvent.click(arabicOption);

    expect(document.documentElement.dir).toBe('rtl');
  });

  it('should update document dir attribute when switching to English', async () => {
    // Start with Arabic
    await i18n.changeLanguage('ar');
    document.documentElement.dir = 'rtl';

    render(<LanguageSwitcher />);
    const button = screen.getByRole('button', { name: 'اللغة' });

    fireEvent.click(button);
    const menuItems = screen.getAllByRole('menuitem');
    const englishOption = menuItems[0]; // First option is English
    fireEvent.click(englishOption);

    expect(document.documentElement.dir).toBe('ltr');
  });
});
