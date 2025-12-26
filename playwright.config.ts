import { defineConfig, devices } from '@playwright/test';

// Zmienne środowiskowe dla testów E2E
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-for-e2e-tests-only';
process.env.AUTH_TRUST_HOST = 'true';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET || 'test-secret-for-e2e-tests-only',
      AUTH_TRUST_HOST: 'true',
    },
  },
});
