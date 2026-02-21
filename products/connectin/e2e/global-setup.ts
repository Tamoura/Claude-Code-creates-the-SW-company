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
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.getByLabel(/email/i).fill(USER_EMAIL);
    await page.getByLabel(/password/i).fill(USER_PASSWORD);
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
