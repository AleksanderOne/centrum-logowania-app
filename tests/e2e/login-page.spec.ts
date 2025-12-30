import { test, expect } from '@playwright/test';

test.describe('E2E: Strona Logowania', () => {
  test('powinna wyświetlać stronę logowania z przyciskiem Google', async ({ page }) => {
    // 1. Wejście na stronę główną
    await page.goto('/');

    // 2. Sprawdzenie czy widoczny jest tytuł (nagłówek h1)
    await expect(page.getByRole('heading', { name: 'Centrum Logowania' })).toBeVisible();

    // 3. Sprawdzenie sekcji logowania
    await expect(page.getByRole('heading', { name: 'Zaloguj się' })).toBeVisible();

    // 4. Sprawdzenie przycisku logowania Google
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

  test('powinna wyświetlać sekcję features', async ({ page }) => {
    await page.goto('/');

    // Sprawdzenie czy widoczne są kluczowe features
    await expect(page.getByText('Maksymalne bezpieczeństwo')).toBeVisible();
    await expect(page.getByText('Błyskawiczna wydajność')).toBeVisible();
    await expect(page.getByText('Łatwa integracja')).toBeVisible();
  });

  test('powinna nawigować do sekcji logowania po kliknięciu CTA', async ({ page }) => {
    await page.goto('/');

    // Kliknięcie przycisku CTA
    await page.getByRole('button', { name: 'Rozpocznij teraz' }).click();

    // Sprawdzenie czy sekcja logowania jest widoczna
    await expect(page.locator('#login')).toBeInViewport();
  });
});
