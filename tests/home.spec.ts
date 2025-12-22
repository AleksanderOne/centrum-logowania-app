import { test, expect } from '@playwright/test';

test('strona główna wyświetla formularz logowania', async ({ page }) => {
    await page.goto('/');

    // Sprawdź czy widoczne są główne elementy tekstowe
    await expect(page.getByText('Centrum Logowania')).toBeVisible();
    await expect(page.getByText('Witaj ponownie')).toBeVisible();

    // Sprawdź czy jest formularz logowania
    await expect(page.getByRole('button', { name: 'Kontynuuj z Google' })).toBeVisible();

    // Sprawdź stopkę
    await expect(page.getByText('Status systemu:')).toBeVisible();
});
