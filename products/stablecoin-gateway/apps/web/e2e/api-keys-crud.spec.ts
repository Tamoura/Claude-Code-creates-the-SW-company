import { test, expect, navigateTo } from './fixtures/auth.fixture';

test.describe('API Keys CRUD', () => {

  test('API Keys page loads and shows create button', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/api-keys');

    await expect(authedPage.locator('h1:has-text("API Keys")')).toBeVisible();
    const createBtn = authedPage.locator('button', { hasText: /create/i });
    await expect(createBtn).toBeVisible();
  });

  test('create API key shows form with name and permissions', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/api-keys');

    const createBtn = authedPage.locator('button', { hasText: /create/i });
    await createBtn.click();

    await expect(authedPage.locator('#key-name')).toBeVisible();
    await expect(authedPage.locator('label', { hasText: 'Read' })).toBeVisible();
    await expect(authedPage.locator('label', { hasText: 'Write' })).toBeVisible();
    await expect(authedPage.locator('label', { hasText: 'Refund' })).toBeVisible();

    await authedPage.locator('button', { hasText: 'Cancel' }).click();
    await expect(authedPage.locator('#key-name')).not.toBeVisible();
  });

  test('create API key via form and verify it appears in list', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/api-keys');

    // Open form (button says "Create API Key")
    await authedPage.locator('button', { hasText: /create api key/i }).click();
    await authedPage.locator('#key-name').fill('E2E Test Key');
    await authedPage.locator('label', { hasText: 'Write' }).click();

    // Submit form (button says "Create Key")
    await authedPage.locator('button', { hasText: /^Create Key$/ }).click();

    await expect(authedPage.locator('text=API Key Created')).toBeVisible({ timeout: 10000 });

    await authedPage.locator('button', { hasText: /dismiss/i }).click();
    await expect(authedPage.locator('td:has-text("E2E Test Key")')).toBeVisible();
  });

  test('revoke API key removes it from list', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/api-keys');

    // Open form and create a key with unique name
    await authedPage.locator('button', { hasText: /create api key/i }).click();
    await authedPage.locator('#key-name').fill('E2E Revoke Key');
    await authedPage.locator('button', { hasText: /^Create Key$/ }).click();

    await expect(authedPage.locator('text=API Key Created')).toBeVisible({ timeout: 10000 });
    await authedPage.locator('button', { hasText: /dismiss/i }).click();

    // Wait for the key to appear in list
    const keyCell = authedPage.locator('td:has-text("E2E Revoke Key")');
    await expect(keyCell).toBeVisible({ timeout: 5000 });

    // Click Revoke on the specific row
    const keyRow = authedPage.locator('tr', { has: keyCell });
    const revokeBtn = keyRow.locator('button', { hasText: /revoke/i });
    await revokeBtn.click();

    // Wait for Confirm to appear and click it
    const confirmBtn = keyRow.locator('button', { hasText: /confirm/i });
    await expect(confirmBtn).toBeVisible({ timeout: 3000 });

    // Click Confirm and wait for key removal; retry if DELETE call fails transiently
    await expect(async () => {
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
      await expect(keyCell).not.toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000 });
  });
});
