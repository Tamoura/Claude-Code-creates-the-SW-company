import { test, expect, navigateTo } from './fixtures/auth.fixture';

test.describe('Webhooks CRUD', () => {

  test('Webhooks page loads and shows add button', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/webhooks');

    await expect(authedPage.locator('h1:has-text("Webhooks")')).toBeVisible();
    await expect(authedPage.locator('button', { hasText: /add webhook/i })).toBeVisible();
  });

  test('add webhook form shows URL, description, and events', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/webhooks');

    await authedPage.locator('button', { hasText: /add webhook/i }).click();

    // Form fields visible
    await expect(authedPage.locator('#wh-url')).toBeVisible();
    await expect(authedPage.locator('#wh-desc')).toBeVisible();

    // Event checkboxes visible
    await expect(authedPage.locator('text=payment.created')).toBeVisible();
    await expect(authedPage.locator('text=payment.completed')).toBeVisible();

    // Cancel hides form
    await authedPage.locator('button', { hasText: 'Cancel' }).click();
    await expect(authedPage.locator('#wh-url')).not.toBeVisible();
  });

  test('create webhook and verify it appears in list', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/webhooks');

    await authedPage.locator('button', { hasText: /add webhook/i }).click();

    // Fill form with a unique URL
    await authedPage.locator('#wh-url').fill('https://httpbin.org/e2e-create');
    await authedPage.locator('#wh-desc').fill('E2E test webhook');

    // Select events (click labels to toggle checkboxes)
    await authedPage.locator('label', { hasText: 'payment.created' }).click();
    await authedPage.locator('label', { hasText: 'payment.completed' }).click();

    // Submit — use waitForResponse to ensure API call completes
    const submitBtn = authedPage.locator('button', { hasText: /^Create Webhook$/ });
    await expect(submitBtn).toBeEnabled();
    const [response] = await Promise.all([
      authedPage.waitForResponse(resp => resp.url().includes('/v1/webhooks') && resp.request().method() === 'POST', { timeout: 30000 }),
      submitBtn.click(),
    ]);
    expect(response.status()).toBe(201);

    // Secret banner should appear with "Webhook Created" title
    await expect(authedPage.locator('text=Webhook Created')).toBeVisible({ timeout: 5000 });

    // Dismiss the secret banner
    await authedPage.locator('button', { hasText: /dismiss/i }).click();

    // Webhook should appear in list (use specific URL to avoid multi-match)
    await expect(authedPage.locator('code', { hasText: /e2e-create/ })).toBeVisible();
    await expect(authedPage.locator('text=Active').first()).toBeVisible();
  });

  test('delete webhook removes it from list', async ({ authedPage }) => {
    await navigateTo(authedPage, '/dashboard/webhooks');

    // Create a webhook with a unique URL
    await authedPage.locator('button', { hasText: /add webhook/i }).click();
    await authedPage.locator('#wh-url').fill('https://httpbin.org/e2e-delete');
    await authedPage.locator('label', { hasText: 'payment.failed' }).click();

    const delSubmitBtn = authedPage.locator('button', { hasText: /^Create Webhook$/ });
    await expect(delSubmitBtn).toBeEnabled();
    const [delResponse] = await Promise.all([
      authedPage.waitForResponse(resp => resp.url().includes('/v1/webhooks') && resp.request().method() === 'POST', { timeout: 30000 }),
      delSubmitBtn.click(),
    ]);
    expect(delResponse.status()).toBe(201);

    await expect(authedPage.locator('text=Webhook Created')).toBeVisible({ timeout: 5000 });
    await authedPage.locator('button', { hasText: /dismiss/i }).click();

    // Verify it's in the list
    await expect(authedPage.locator('code', { hasText: /e2e-delete/ })).toBeVisible();

    // Count webhooks before delete
    const countBefore = await authedPage.locator('button', { hasText: /^Delete$/ }).count();

    // Click Delete on the first webhook (the newly created one)
    await authedPage.locator('button', { hasText: /^Delete$/ }).first().click();

    // Click Confirm
    await authedPage.locator('button', { hasText: /^Confirm$/ }).first().click();

    // Wait for the webhook count to decrease or the specific webhook to disappear
    await expect(async () => {
      const currentCount = await authedPage.locator('button', { hasText: /^Delete$/ }).count();
      expect(currentCount).toBeLessThan(countBefore);
    }).toPass({ timeout: 10000 });
  });
});
