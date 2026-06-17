import { test, expect } from '@playwright/test';
import { signupNewUser } from '../../../support/helpers';

/**
 * US-12 — Export my data. The Settings page exposes a "Download JSON export"
 * link that streams the requester's data via the session cookie.
 */
test.describe('US-12 — Export', () => {
  test('[US-12][AC-1] settings export downloads a JSON file', async ({
    page,
  }) => {
    await signupNewUser(page);
    await page.goto('/settings');
    await expect(
      page.getByRole('heading', { name: 'Export your data' })
    ).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON export' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('studyflow-export.json');

    // Validate the payload is real JSON scoped to the requester (US-12 AC-2).
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

    expect(payload).toHaveProperty('student');
    expect(payload).toHaveProperty('subjects');
    expect(payload).toHaveProperty('selections');
    expect(payload).toHaveProperty('goals');
    expect(payload).toHaveProperty('progressEntries');
  });
});
