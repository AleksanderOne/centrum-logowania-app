import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Konfiguracja dla lokalnych testów wizualnych (bez Percy)
// Używa wbudowanych funkcji Playwright do porównań wizualnych

const SERVER_INFO_FILE = path.join(__dirname, 'tests', '.server-info.json');

function getBaseURL(): string {
  try {
    if (fs.existsSync(SERVER_INFO_FILE)) {
      const info = JSON.parse(fs.readFileSync(SERVER_INFO_FILE, 'utf-8'));
      return `http://localhost:${info.port}`;
    }
  } catch {
    // Ignoruj błędy odczytu
  }
  return process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
}

export default defineConfig({
  testDir: './tests/visual',
  testMatch: /.*\.visual\.spec\.ts/,
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',

  // Testy wizualne lepiej uruchamiać sekwencyjnie i w jednym workerze,
  // aby uniknąć konfliktów sesji (logowanie) i obciążenia screenshooter'a
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: 0, // Visual tests shouldn't retry usually
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: getBaseURL(),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',

    // Domyślny viewport (zostanie nadpisany w testach)
    viewport: { width: 1280, height: 720 },

    // Zwiększone timeouty dla stabilności visual tests
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  expect: {
    toHaveScreenshot: {
      threshold: 0.2, // Tolerancja 20% (dość luźna, można zmniejszyć do 0.1)
      animations: 'disabled',
    },
  },

  // Używamy tylko Chromium dla wszystkich testów wizualnych
  projects: [
    {
      name: 'visual-chrome',
      use: {
        ...devices['Desktop Chrome'],
        // Ważne: deviceScaleFactor: 1 dla spójności screenshotów między maszynami
        deviceScaleFactor: 1,
      },
    },
  ],
});
