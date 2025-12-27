import { test, expect } from '@playwright/test';

/**
 * Testy dashboardu (dla niezalogowanego użytkownika)
 *
 * Dashboard wymaga zalogowania, więc te testy weryfikują
 * że niezalogowany użytkownik nie ma dostępu.
 */
test.describe('Dashboard', () => {
  test('niezalogowany użytkownik nie widzi dashboardu', async ({ page }) => {
    const response = await page.goto('/dashboard');

    // Middleware powinno przekierować (30x) lub odmówić dostępu
    // Sprawdzamy że nie jesteśmy na /dashboard lub widzimy ekran logowania
    const url = page.url();

    // Albo zostaliśmy przekierowani (URL nie zawiera /dashboard)
    // Albo widzimy stronę logowania (szukamy elementów logowania lub przekierowania)
    const isDashboard = url.includes('/dashboard');
    const hasLoginElements =
      (await page.locator('text=Zaloguj').count()) > 0 ||
      (await page.locator('text=Kontynuuj z Google').count()) > 0 ||
      (await page.locator('text=Centrum Logowania').count()) > 0;

    // Niezalogowany użytkownik nie powinien widzieć pełnego dashboardu
    // (albo został przekierowany, albo widzi ekran logowania)
    expect(!isDashboard || hasLoginElements).toBeTruthy();
  });

  test('strona audit wymaga autoryzacji', async ({ page }) => {
    const response = await page.goto('/dashboard/audit');

    // Sprawdzamy że dostęp jest chroniony
    const url = page.url();
    const notOnAudit = !url.includes('/dashboard/audit');
    const hasLoginPrompt = (await page.locator('text=Zaloguj').count()) > 0;

    expect(notOnAudit || hasLoginPrompt).toBeTruthy();
  });

  test('strona user wymaga autoryzacji', async ({ page }) => {
    const response = await page.goto('/dashboard/user/test-id');

    // Sprawdzamy że dostęp jest chroniony
    const url = page.url();
    const notOnUser = !url.includes('/dashboard/user');
    const hasLoginPrompt = (await page.locator('text=Zaloguj').count()) > 0;

    expect(notOnUser || hasLoginPrompt).toBeTruthy();
  });
});

test.describe('Responsywność', () => {
  test('strona główna jest responsywna na mobile', async ({ page }) => {
    // Ustaw rozmiar mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Sprawdź czy elementy są widoczne
    await expect(page.getByText('Centrum Logowania')).toBeVisible();
    await expect(page.getByRole('button', { name: /Kontynuuj z Google/i })).toBeVisible();
  });

  test('strona główna jest responsywna na tablet', async ({ page }) => {
    // Ustaw rozmiar tablet
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');

    // Sprawdź czy elementy są widoczne
    await expect(page.getByText('Centrum Logowania')).toBeVisible();
    await expect(page.getByRole('button', { name: /Kontynuuj z Google/i })).toBeVisible();
  });
});

test.describe('Wydajność', () => {
  test('strona główna ładuje się w rozsądnym czasie', async ({ page }) => {
    const start = Date.now();

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const loadTime = Date.now() - start;

    // Strona powinna załadować się w mniej niż 5 sekund
    expect(loadTime).toBeLessThan(5000);
  });

  test('API health ładuje się szybko', async ({ request }) => {
    const start = Date.now();

    await request.get('/api/health');

    const responseTime = Date.now() - start;

    // API powinno odpowiedzieć w mniej niż 2 sekundy
    expect(responseTime).toBeLessThan(2000);
  });
});
