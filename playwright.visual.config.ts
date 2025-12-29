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
  fullyParallel: false, // Testy wizualne lepiej uruchamiać sekwencyjnie
  forbidOnly: !!process.env.CI,
  retries: 0, // Nie retry dla testów wizualnych
  workers: 1, // Jeden worker dla stabilności
  reporter: 'html',
  use: {
    baseURL: getBaseURL(),
    trace: 'on',
    screenshot: 'only-on-failure',
    // Włącz porównania wizualne
    video: 'retain-on-failure',
  },
  expect: {
    // Konfiguracja porównań wizualnych
    toHaveScreenshot: {
      // Próg różnicy (0-1), 0 = identyczne, 1 = całkowicie różne
      threshold: 0.2,
      // Animacje mogą powodować różnice
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'visual-desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'visual-desktop-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'visual-ipad-pro',
      use: {
        ...devices['iPad Pro'],
      },
    },
    {
      name: 'visual-iphone-14',
      use: {
        ...devices['iPhone 14 Pro'],
      },
    },
  ],
});
