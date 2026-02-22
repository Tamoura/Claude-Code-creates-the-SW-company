import { chromium, type FullConfig } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3111';
const USER_EMAIL = 'user1@connectin.dev';
const USER_PASSWORD = 'Test1234!';

/**
 * Global setup: log in once before all tests and save the browser storage state
 * (cookies, localStorage) to a file.  Authenticated fixtures load this saved
 * state instead of performing a fresh login for every test — much faster and
 * avoids rate-limit / timeout issues when tests run in parallel.
 */
async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  // Set locale and language to English so i18next-browser-languagedetector
  // picks 'en' instead of falling back to Arabic (fallbackLng: 'ar') in CI
  // where headless Chromium has no system locale configured.
  const context = await browser.newContext({
    locale: 'en-US',
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            { name: 'connectin-lang', value: 'en' },
            { name: 'connectin-cookie-consent', value: 'accepted' },
          ],
        },
      ],
    },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Use stable ID selectors instead of label text — the login page is
    // bilingual (Arabic/English) and SSR may render Arabic even when the
    // browser has 'connectin-lang: en' set, causing a hydration mismatch
    // that prevents label-based selectors from working reliably in CI.
    await page.locator('#email').fill(USER_EMAIL);
    await page.locator('#password').fill(USER_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/(feed|dashboard|home|profile|network|jobs)/, { timeout: 30_000 });

    // Save the full browser state (cookies + localStorage)
    await context.storageState({ path: 'e2e/auth-state.json' });
    console.log('[global-setup] Auth state saved to e2e/auth-state.json');
  } finally {
    await browser.close();
  }
}

export default globalSetup;
