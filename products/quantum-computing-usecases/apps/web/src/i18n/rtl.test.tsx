import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import i18n from './i18n';

describe('RTL Support', () => {
  beforeEach(() => {
    // Reset to English and clear document state
    i18n.changeLanguage('en');
    document.documentElement.dir = 'ltr';
  });

  it('should set document direction to ltr for English', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('should set document direction to rtl for Arabic', async () => {
    await i18n.changeLanguage('ar');

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('should update direction when language changes', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(document.documentElement.dir).toBe('ltr');

    await i18n.changeLanguage('ar');
    expect(document.documentElement.dir).toBe('rtl');

    await i18n.changeLanguage('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
