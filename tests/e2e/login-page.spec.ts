import { test, expect } from '@playwright/test';

test.describe('E2E: Strona Logowania', () => {
  test('powinna wyświetlać stronę logowania z przyciskiem Google', async ({ page }) => {
    // 1. Wejście na stronę główną
    await page.goto('/');

    // 2. Sprawdzenie czy widoczny jest tytuł
    await expect(page.getByText('Centrum Logowania')).toBeVisible();
    await expect(page.getByText('Witaj ponownie')).toBeVisible();

    // 3. Sprawdzenie przycisku logowania Google
    await expect(page.getByRole('button', { name: /Kontynuuj z Google/i })).toBeVisible();
  });

  test('powinna wyświetlać status systemu', async ({ page }) => {
    await page.goto('/');

    // Sprawdzenie czy jest sekcja statusu systemu
    await expect(page.getByText('Status systemu:')).toBeVisible({ timeout: 10000 });
  });

  test('powinna wyświetlać wersję aplikacji', async ({ page }) => {
    await page.goto('/');

    // Wersja jest wyświetlana w stopce
    await expect(page.getByText(/v\d+\.\d+\.\d+/)).toBeVisible();
  });
});
