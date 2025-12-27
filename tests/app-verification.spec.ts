import { test, expect } from '@playwright/test';

/**
 * Test weryfikacyjny - sprawdza czy uruchomiona jest właściwa aplikacja
 * Ten test powinien być uruchamiany jako pierwszy żeby szybko wykryć
 * problemy z konfiguracją (np. inna aplikacja na tym samym porcie)
 */
test.describe('Weryfikacja aplikacji', () => {
  test('serwer uruchamia centrum-logowania-app (nie inną aplikację)', async ({ page }) => {
    // Przejdź do strony głównej
    const response = await page.goto('/');

    // Sprawdź że serwer odpowiada
    expect(response?.status()).toBe(200);

    // Sprawdź zawartość strony
    const pageContent = await page.content();

    // Weryfikacja że to właściwa aplikacja - sprawdź charakterystyczne elementy
    const isCentrumLogowania =
      pageContent.includes('Centrum Logowania') ||
      pageContent.includes('ShieldCheck') || // ikona z lucide-react
      pageContent.includes('Kontynuuj z Google') ||
      pageContent.includes('Centralny system uwierzytelniania');

    // Sprawdź że NIE jest to inna znana aplikacja
    const isOtherApp =
      pageContent.includes('Database Admin Panel') ||
      pageContent.includes('Flashcards') ||
      pageContent.includes('DB Admin Panel');

    if (isOtherApp) {
      throw new Error(
        `❌ BŁĄD KONFIGURACJI: Na porcie testowym działa INNA aplikacja!\n` +
          `   Znaleziono: Database Admin Panel / Flashcards\n` +
          `   Oczekiwano: Centrum Logowania\n\n` +
          `   Rozwiązanie: Zatrzymaj inne aplikacje lub zmień port w playwright.config.ts`
      );
    }

    expect(isCentrumLogowania).toBe(true);
  });

  test('endpoint /api/health zwraca poprawny status', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);

    const data = await response.json();

    // Sprawdź że to jest API centrum-logowania-app
    expect(data).toHaveProperty('status');
    // W CI nie mamy Google OAuth credentials, więc status może być "degraded"
    // "operational" = wszystko działa, "degraded" = baza OK ale brak OAuth
    expect(['operational', 'degraded']).toContain(data.status);
    expect(data).toHaveProperty('timestamp');
  });
});
