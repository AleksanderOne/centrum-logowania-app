import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { nanoid } from 'nanoid';

/**
 * Testy wizualne dla Szczegółów Projektu
 *
 * Scenariusz (User Flow):
 * 1. Zaloguj się
 * 2. Wejdź na Dashboard
 * 3. Kliknij "Dodaj projekt"
 * 4. Wypełnij formularz (Nazwa, Slug, Domena)
 * 5. Utwórz projekt
 * 6. Zrób snapshot widoku szczegółów nowo utworzonego projektu
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

test.describe('Szczegóły Projektu - Testy Wizualne (UI Flow)', () => {

  for (const viewport of VIEWPORTS) {
    test.describe(`Urządzenie: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {

      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await loginAsTestUser(page);
      });

      test(`Tworzenie projektu i Test Integracji - ${viewport.name}`, async ({ page }) => {
        // Debugowanie: Logi z przeglądarki
        page.on('console', msg => console.log(`[Browser ${viewport.name}] ${msg.text()}`));
        page.on('pageerror', exception => console.log(`[Browser Error ${viewport.name}] ${exception}`));

        // 1. Dashboard (Zakładka Projekty)
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // 2. Utwórz nowy projekt
        await expect(page.getByText('Nowy Projekt')).toBeVisible();

        const uniqueId = nanoid(5).toLowerCase();
        const projectName = `VisualTest-${uniqueId}`;
        const projectDomain = `http://localhost:3000`;

        await page.getByLabel('Nazwa Projektu').fill(projectName);
        const domainInput = page.getByLabel('Domena / URL');
        if (await domainInput.isVisible()) {
          await domainInput.fill(projectDomain);
        }

        console.log(`[Test] Tworzenie projektu: ${projectName}`);
        await page.getByRole('button', { name: /Utwórz Projekt/i }).click();

        // 3. Snapshot po utworzeniu (bez sprawdzania toastów assertami)
        await page.waitForTimeout(3000);

        await expect(page).toHaveScreenshot(`05_projekt_po_utworzeniu-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          mask: [
            // page.locator('text=/Utworzono/i'),
            // page.locator('text=/Last active/i'),
            // page.locator('.font-mono'),
          ],
        });

        // 4. Kliknij "Testuj"
        await page.waitForTimeout(500); // Stabilizacja po utworzeniu

        // Znajdź kartę projektu (używamy data-slot="card" i szukamy po nazwie projektu)
        const projectCard = page.locator('[data-slot="card"]').filter({ hasText: projectName }).first();
        await expect(projectCard).toBeVisible({ timeout: 10000 });

        // Kliknij Testuj
        const testButton = projectCard.getByRole('button', { name: 'Testuj' });
        await testButton.click();

        // Czekamy na modal
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Test integracji');

        await page.waitForTimeout(1000); // Stabilizacja animacji

        // 5. Snapshot modala
        await expect(page).toHaveScreenshot(`06_projekt_modal_test-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          mask: [
            // page.locator('.font-mono'), // Maskowanie ewentualnych ID
          ],
        });

        // 6. Zamknij modal "Testuj"
        await dialog.getByRole('button', { name: 'Zamknij' }).click();
        await expect(dialog).toBeHidden();

        // 7. Kliknij "Sesje"
        const sessionsButton = projectCard.getByRole('button', { name: 'Sesje' });
        await sessionsButton.click();

        // Czekamy na modal
        const sessionsDialog = page.getByRole('dialog');
        await expect(sessionsDialog).toBeVisible();
        await expect(sessionsDialog).toContainText('Aktywne sesje');

        await page.waitForTimeout(1000); // Stabilizacja

        // 8. Snapshot modala Sesje
        await expect(page).toHaveScreenshot(`07_projekt_modal_sesje-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          mask: [
            // page.locator('.font-mono'),
          ]
        });

        // 9. Zamknij modal "Sesje"
        await sessionsDialog.getByRole('button', { name: 'Zamknij' }).click();
        await expect(sessionsDialog).toBeHidden();

        // 10. Kliknij "Quick Connect"
        const qcButton = projectCard.getByRole('button', { name: 'Quick Connect' });
        await qcButton.click();

        // Czekamy na modal
        const qcDialog = page.getByRole('dialog');
        await expect(qcDialog).toBeVisible();
        await expect(qcDialog).toContainText('Quick Connect');

        await page.waitForTimeout(1000); // Stabilizacja

        // 11. Snapshot modala Quick Connect
        await expect(page).toHaveScreenshot(`08_projekt_modal_quick_connect-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          mask: [
            // page.locator('.font-mono'),
          ]
        });

        // 12. Wygeneruj kod
        await qcDialog.getByRole('button', { name: 'Wygeneruj nowy kod' }).click();
        await expect(qcDialog).toContainText('Aktywne kody');
        await page.waitForTimeout(1000); // Stabilizacja

        // 13. Snapshot po wygenerowaniu
        await expect(page).toHaveScreenshot(`09_projekt_modal_quick_connect_wygenerowany-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          mask: [
            // page.locator('.font-mono'),
          ]
        });

        // 14. Zamknij modal Quick Connect
        await qcDialog.getByRole('button', { name: 'Zamknij' }).click();
        await expect(qcDialog).toBeHidden();

        // 15. Kliknij "Członkowie"
        const membersButton = projectCard.getByRole('button', { name: 'Członkowie' });
        await membersButton.click();

        // Czekamy na modal
        const membersDialog = page.getByRole('dialog');
        await expect(membersDialog).toBeVisible();
        await expect(membersDialog).toContainText('Członkowie projektu');

        await page.waitForTimeout(1000); // Stabilizacja

        // 16. Snapshot modala Członkowie
        await expect(page).toHaveScreenshot(`10_projekt_modal_czlonkowie-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          mask: [
            // page.locator('.font-mono'),
          ]
        });

        // 17. Zmień widoczność (Publiczny <-> Prywatny)
        const toggleBtn = membersDialog.getByRole('button', { name: /Publiczny/ });
        await toggleBtn.click();

        await page.waitForTimeout(2000); // Stabilizacja

        // 18. Snapshot po zmianie widoczności
        await expect(page).toHaveScreenshot(`11_projekt_modal_czlonkowie_zmiana-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          mask: [
            // page.locator('.font-mono'),
            // page.locator('.sonner-toast'), // Maskujemy toasty
          ]
        });

      });
    });
  }
});
