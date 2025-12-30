import { test, expect } from '@playwright/test';

/**
 * Testy wizualne dla strony głównej (Homepage / Login)
 * Pokrycie głównego widoku na 3 urządzeniach (łącznie 3 snapshoty).
 *
 * Widok:
 * 1. Strona Główna (/)
 *
 * Urządzenia:
 * - Desktop: 1920x1080
 * - Tablet: 1024x768
 * - Mobile: 390x844
 */

const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
];

test.describe('Strona Główna - Testy Wizualne', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`Urządzenie: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      test(`Homepage - ${viewport.name}`, async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500); // Stabilizacja

        await expect(page).toHaveScreenshot(`01_${viewport.name}_strona_glowna.png`, {
          fullPage: true,
          animations: 'disabled',
        });
      });
    });
  }
});
