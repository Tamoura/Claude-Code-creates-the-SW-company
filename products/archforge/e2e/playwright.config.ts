import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3116',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command:
        'cd ../apps/api && DATABASE_URL="postgresql://tamer@localhost:5432/archforge_dev" JWT_SECRET="test-jwt-secret" OPENROUTER_API_KEY="test-key" INTERNAL_API_KEY="test-key" npm run dev',
      port: 5012,
      reuseExistingServer: true,
      timeout: 15000,
    },
    {
      command: 'cd ../apps/web && npm run dev',
      port: 3116,
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
