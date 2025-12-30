import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';

/**
 * Testy wizualne dla Dashboard
 * Pokrycie 3 kluczowych widoków na 3 urządzeniach (łącznie 9 snapshotów).
 *
 * Widoki:
 * 1. Projekty (/dashboard)
 * 2. Logi (/dashboard/audit)
 * 3. Użytkownik (/dashboard/user)
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

test.describe('Dashboard - Testy Wizualne (Pełna Macierz)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  for (const viewport of VIEWPORTS) {
    test.describe(`Urządzenie: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      // 1. Projekty (Główny Dashboard)
      test(`Projekty - ${viewport.name}`, async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Czekamy na załadowanie treści (nagłówek "Twoje Projekty")
        const projectsHeader = page.getByRole('heading', { name: 'Twoje Projekty' });
        await expect(projectsHeader).toBeVisible();
        await projectsHeader.scrollIntoViewIfNeeded();

        // Upewniamy się, że formularz dodawania projektu jest widoczny
        await expect(page.getByText('Nowy Projekt')).toBeVisible();

        await page.waitForTimeout(500); // Stabilizacja animacji

        await expect(page).toHaveScreenshot(`02_${viewport.name}_panel_projekty.png`, {
          fullPage: true,
          animations: 'disabled',
        });
      });

      // 2. Logi (Audit)
      test(`Logi - ${viewport.name}`, async ({ page }) => {
        await page.goto('/dashboard/audit');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500); // Stabilizacja animacji

        await expect(page).toHaveScreenshot(`03_${viewport.name}_panel_logi.png`, {
          fullPage: true,
          animations: 'disabled',
        });
      });

      // 3. Użytkownik (Profil)
      test(`Użytkownik - ${viewport.name}`, async ({ page }) => {
        await page.goto('/dashboard/user');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500); // Stabilizacja animacji

        await expect(page).toHaveScreenshot(`04_${viewport.name}_panel_profil.png`, {
          fullPage: true,
          animations: 'disabled',
        });
      });
    });
  }
});
