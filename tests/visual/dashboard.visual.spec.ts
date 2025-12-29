import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';

/**
 * Testy wizualne dla Dashboard
 * Używają toHaveScreenshot() dla lokalnych porównań (bez Percy)
 *
 * Rozdzielczości:
 * - Desktop: 1920x1080
 * - Tablet: 1024x768
 * - Mobile: 390x844
 */
test.describe('Dashboard - Testy Wizualne', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  // ========================================
  // DESKTOP (1920x1080)
  // ========================================
  test.describe('Desktop (1920x1080)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
    });

    test('Dashboard - widok główny', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Czekaj na główne elementy
      await expect(page.locator('body')).toBeVisible();
      await page.waitForTimeout(500); // Animacje

      await expect(page).toHaveScreenshot('dashboard-main-desktop.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Dashboard - lista projektów', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Scroll do sekcji projektów
      const projectsSection = page.locator('text=Twoje Projekty').first();
      if (await projectsSection.isVisible()) {
        await projectsSection.scrollIntoViewIfNeeded();
      }

      await expect(page).toHaveScreenshot('dashboard-projects-desktop.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Dashboard - strona audytu', async ({ page }) => {
      await page.goto('/dashboard/audit');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-audit-desktop.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Dashboard - profil użytkownika', async ({ page }) => {
      await page.goto('/dashboard/user');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-user-desktop.png', {
        fullPage: true,
        animations: 'disabled',
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

    test('Dashboard - widok główny', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-main-tablet.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Dashboard - lista projektów', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('dashboard-projects-tablet.png', {
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

    test('Dashboard - widok główny', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-main-mobile.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Dashboard - menu nawigacji', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Jeśli jest menu hamburger - otwórz je
      const menuButton = page
        .locator('[data-testid="mobile-menu"], button:has-text("Menu")')
        .first();
      if (await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await menuButton.click();
        await page.waitForTimeout(300);
      }

      await expect(page).toHaveScreenshot('dashboard-menu-mobile.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('Dashboard - strona audytu', async ({ page }) => {
      await page.goto('/dashboard/audit');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-audit-mobile.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });
});
