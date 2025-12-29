import { test, expect } from '@playwright/test';

test.describe('E2E: Ochrona Tras (Route Protection)', () => {
  test('powinien przekierować niezalogowanego użytkownika z /dashboard na /', async ({ page }) => {
    // Próba wejścia na chroniony zasób bez sesji
    await page.goto('/dashboard');

    // Sprawdzenie przekierowania na stronę logowania
    await expect(page).toHaveURL(/\/(\?callbackUrl=.*)?$/);

    // Upewnienie się, że widoczny jest formularz logowania
    await expect(page.getByRole('button', { name: /Kontynuuj z Google/i })).toBeVisible();
  });

  test('powinien przekierować niezalogowanego użytkownika z /dashboard/audit na /', async ({
    page,
  }) => {
    await page.goto('/dashboard/audit');

    await expect(page).toHaveURL(/\/(\?callbackUrl=.*)?$/);
    await expect(page.getByRole('button', { name: /Kontynuuj z Google/i })).toBeVisible();
  });

  test('powinien przekierować niezalogowanego użytkownika z /dashboard/user na /', async ({
    page,
  }) => {
    await page.goto('/dashboard/user');

    await expect(page).toHaveURL(/\/(\?callbackUrl=.*)?$/);
    await expect(page.getByRole('button', { name: /Kontynuuj z Google/i })).toBeVisible();
  });

  test('powinien przekierować niezalogowanego użytkownika z /authorize na /', async ({ page }) => {
    await page.goto('/authorize?client_id=test&redirect_uri=http://localhost:3000/callback');

    await expect(page).toHaveURL(/\/(\?callbackUrl=.*)?$/);
    await expect(page.getByRole('button', { name: /Kontynuuj z Google/i })).toBeVisible();
  });
});
