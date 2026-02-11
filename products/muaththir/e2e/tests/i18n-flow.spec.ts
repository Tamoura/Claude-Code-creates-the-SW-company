import { test, expect } from '@playwright/test';

/**
 * Internationalization (i18n) Flow E2E Tests
 *
 * Tests language switching between English and Arabic:
 * - LanguageSwitcher component toggles locale
 * - RTL layout applied when Arabic is active
 * - LTR layout applied when English is active
 * - Page content changes language when switched
 *
 * The app uses next-intl with a cookie-based locale.
 * The LanguageSwitcher calls a server action (setLocale) which
 * sets a NEXT_LOCALE cookie and the RootLayout reads the locale
 * to set html lang and dir attributes.
 */

test.describe('i18n Flow', () => {
  test.describe('Default Language (English)', () => {
    test('landing page loads in English by default', async ({ page }) => {
      await page.goto('/');

      // HTML lang should be "en"
      const htmlLang = await page
        .locator('html')
        .getAttribute('lang');
      expect(htmlLang).toBe('en');

      // HTML dir should be "ltr"
      const htmlDir = await page
        .locator('html')
        .getAttribute('dir');
      expect(htmlDir).toBe('ltr');
    });

    test('header has language switcher showing Arabic option', async ({
      page,
    }) => {
      await page.goto('/');

      // Language switcher should show Arabic text when current is English
      const langSwitcher = page.locator(
        'button[aria-label="Switch to Arabic"]'
      );
      await expect(langSwitcher).toBeVisible({ timeout: 10000 });
      await expect(langSwitcher).toContainText('عربي');
    });
  });

  test.describe('Language Switching', () => {
    test('clicking language switcher changes to Arabic', async ({
      page,
    }) => {
      await page.goto('/');

      // Click the language switcher
      const langSwitcher = page.locator(
        'button[aria-label="Switch to Arabic"]'
      );
      await expect(langSwitcher).toBeVisible({ timeout: 10000 });
      await langSwitcher.click();

      // Wait for the page to reload with Arabic
      // After switching, the button label changes to show "English"
      const englishSwitcher = page.locator(
        'button[aria-label="التبديل إلى الإنجليزية"]'
      );
      await expect(englishSwitcher).toBeVisible({ timeout: 15000 });

      // HTML lang should now be "ar"
      const htmlLang = await page
        .locator('html')
        .getAttribute('lang');
      expect(htmlLang).toBe('ar');

      // HTML dir should be "rtl"
      const htmlDir = await page
        .locator('html')
        .getAttribute('dir');
      expect(htmlDir).toBe('rtl');
    });

    test('switching back to English restores LTR', async ({ page }) => {
      // Start in Arabic by setting the cookie
      await page.context().addCookies([
        {
          name: 'NEXT_LOCALE',
          value: 'ar',
          domain: 'localhost',
          path: '/',
        },
      ]);

      await page.goto('/');

      // Should be in Arabic
      const htmlLang = await page
        .locator('html')
        .getAttribute('lang');
      expect(htmlLang).toBe('ar');

      // Click to switch back to English
      const langSwitcher = page.locator(
        'button[aria-label="التبديل إلى الإنجليزية"]'
      );
      await expect(langSwitcher).toBeVisible({ timeout: 15000 });
      await langSwitcher.click();

      // Wait for English switcher to appear
      const arabicSwitcher = page.locator(
        'button[aria-label="Switch to Arabic"]'
      );
      await expect(arabicSwitcher).toBeVisible({ timeout: 15000 });

      // HTML should be back to English LTR
      const newLang = await page
        .locator('html')
        .getAttribute('lang');
      expect(newLang).toBe('en');

      const newDir = await page
        .locator('html')
        .getAttribute('dir');
      expect(newDir).toBe('ltr');
    });
  });

  test.describe('RTL Layout Verification', () => {
    test('Arabic layout applies RTL direction to body content', async ({
      page,
    }) => {
      // Set Arabic locale cookie before visiting
      await page.context().addCookies([
        {
          name: 'NEXT_LOCALE',
          value: 'ar',
          domain: 'localhost',
          path: '/',
        },
      ]);

      await page.goto('/');

      // Verify RTL at document level
      const htmlDir = await page
        .locator('html')
        .getAttribute('dir');
      expect(htmlDir).toBe('rtl');

      // Main heading should still be visible (just in Arabic)
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('Arabic login page applies RTL', async ({ page }) => {
      await page.context().addCookies([
        {
          name: 'NEXT_LOCALE',
          value: 'ar',
          domain: 'localhost',
          path: '/',
        },
      ]);

      await page.goto('/login');

      const htmlDir = await page
        .locator('html')
        .getAttribute('dir');
      expect(htmlDir).toBe('rtl');

      // Form elements should still be functional
      const emailInput = page.locator('#email');
      await expect(emailInput).toBeVisible({ timeout: 10000 });
    });

    test('Arabic pricing page applies RTL', async ({ page }) => {
      await page.context().addCookies([
        {
          name: 'NEXT_LOCALE',
          value: 'ar',
          domain: 'localhost',
          path: '/',
        },
      ]);

      await page.goto('/pricing');

      const htmlDir = await page
        .locator('html')
        .getAttribute('dir');
      expect(htmlDir).toBe('rtl');

      // Heading should be visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('Arabic about page applies RTL', async ({ page }) => {
      await page.context().addCookies([
        {
          name: 'NEXT_LOCALE',
          value: 'ar',
          domain: 'localhost',
          path: '/',
        },
      ]);

      await page.goto('/about');

      const htmlDir = await page
        .locator('html')
        .getAttribute('dir');
      expect(htmlDir).toBe('rtl');

      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('LTR Layout Verification', () => {
    test('English layout applies LTR direction', async ({ page }) => {
      // Ensure English cookie (or no cookie, since en is default)
      await page.context().addCookies([
        {
          name: 'NEXT_LOCALE',
          value: 'en',
          domain: 'localhost',
          path: '/',
        },
      ]);

      await page.goto('/');

      const htmlDir = await page
        .locator('html')
        .getAttribute('dir');
      expect(htmlDir).toBe('ltr');

      const htmlLang = await page
        .locator('html')
        .getAttribute('lang');
      expect(htmlLang).toBe('en');
    });
  });

  test.describe('Language Persistence', () => {
    test('Arabic language persists across page navigation', async ({
      page,
    }) => {
      await page.context().addCookies([
        {
          name: 'NEXT_LOCALE',
          value: 'ar',
          domain: 'localhost',
          path: '/',
        },
      ]);

      // Visit landing page
      await page.goto('/');
      let htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('ar');

      // Navigate to about page
      await page.goto('/about');
      htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('ar');

      // Navigate to pricing page
      await page.goto('/pricing');
      htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('ar');

      // Navigate to login page
      await page.goto('/login');
      htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('ar');
    });
  });
});
