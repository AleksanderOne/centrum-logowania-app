import { test, expect } from '@playwright/test';

/**
 * Testy wizualne dla strony głównej (logowania)
 * NIE wymagają zalogowania - testują publiczną stronę
 *
 * Rozdzielczości:
 * - Desktop: 1920x1080
 * - Tablet: 1024x768
 * - Mobile: 390x844
 */
test.describe('Strona Główna (Logowanie) - Testy Wizualne', () => {
  // ========================================
  // DESKTOP (1920x1080)
  // ========================================
  test.describe('Desktop (1920x1080)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
    });

    test('Strona logowania - widok główny', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('login-main-desktop.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Strona logowania - z animacjami', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Pozwól animacjom się załadować
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('login-animated-desktop.png', {
        fullPage: true,
        animations: 'allow', // Z animacjami
      });
    });
  });

  // ========================================
  // TABLET (1024x768)
  // ========================================
  test.describe('Tablet (1024x768)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
    });

    test('Strona logowania - widok główny', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('login-main-tablet.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // ========================================
  // MOBILE (390x844 - iPhone 14)
  // ========================================
  test.describe('Mobile (390x844)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
    });

    test('Strona logowania - widok główny', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('login-main-mobile.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Strona logowania - scroll do stopki', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Scroll na dół
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('login-footer-mobile.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });
});
