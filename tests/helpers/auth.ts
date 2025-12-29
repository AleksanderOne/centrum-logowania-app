import { Page, BrowserContext } from '@playwright/test';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export const TEST_USER_EMAIL = 'test-visual@example.com';
const SERVER_INFO_PATH = path.join(__dirname, '../.server-info.json');

/**
 * Pobiera połączenie do testowej bazy danych z pliku .server-info.json
 */
async function getTestDbClient(): Promise<Client | null> {
  try {
    if (!fs.existsSync(SERVER_INFO_PATH)) {
      console.warn('[Auth] Brak pliku .server-info.json - nie można połączyć z testową bazą');
      return null;
    }

    const info = JSON.parse(fs.readFileSync(SERVER_INFO_PATH, 'utf-8'));
    if (!info.testDbUrl) {
      console.warn('[Auth] Brak testDbUrl w .server-info.json');
      return null;
    }

    const client = new Client({ connectionString: info.testDbUrl });
    await client.connect();
    return client;
  } catch (error) {
    console.error('[Auth] Błąd połączenia z testową bazą:', error);
    return null;
  }
}

/**
 * Tworzy lub pobiera użytkownika testowego z bazy danych
 */
async function ensureTestUser(client: Client): Promise<{ id: string; email: string }> {
  // Sprawdź czy użytkownik już istnieje
  const existingResult = await client.query(
    `SELECT id, email FROM "centrum_logowania"."user" WHERE email = $1`,
    [TEST_USER_EMAIL]
  );

  if (existingResult.rows.length > 0) {
    return existingResult.rows[0];
  }

  // Utwórz nowego użytkownika
  const insertResult = await client.query(
    `INSERT INTO "centrum_logowania"."user" (email, name, role, "emailVerified", token_version)
     VALUES ($1, $2, $3, NOW(), 1)
     RETURNING id, email`,
    [TEST_USER_EMAIL, 'Visual Test User', 'admin']
  );

  return insertResult.rows[0];
}

/**
 * Loguje użytkownika testowego poprzez e2eLogin
 * Wymaga:
 * - Działającego serwera testowego (z global-setup.ts)
 * - E2E_TEST_MODE=true na serwerze
 */
export async function loginAsTestUser(page: Page, _context?: BrowserContext) {
  // 1. Połącz się z testową bazą i upewnij się, że użytkownik istnieje
  const client = await getTestDbClient();
  let user: { id: string; email: string };

  if (client) {
    try {
      user = await ensureTestUser(client);
    } finally {
      await client.end();
    }
  } else {
    // Fallback - zakładamy, że użytkownik zostanie utworzony przez e2eLogin
    user = { id: 'unknown', email: TEST_USER_EMAIL };
  }

  // 2. Idź na stronę logowania
  await page.goto('/');

  // 3. Czekaj na załadowanie strony logowania
  await page.waitForLoadState('networkidle');

  // 4. Czekaj na funkcję e2eLogin (z dłuższym timeoutem)
  try {
    await page.waitForFunction(() => typeof (window as any).e2eLogin === 'function', {
      timeout: 15000,
    });
  } catch {
    throw new Error(
      '[Auth] Funkcja e2eLogin nie jest dostępna. ' +
        'Upewnij się, że serwer działa z E2E_TEST_MODE=true'
    );
  }

  // 5. Wykonaj logowanie
  await page.evaluate((email) => {
    (window as any).e2eLogin(email);
  }, user.email);

  // 6. Czekaj na przekierowanie do dashboard
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'), {
    timeout: 15000,
  });

  return user;
}

/**
 * Wylogowuje użytkownika (czyści cookies/sesję)
 */
export async function logout(page: Page) {
  await page.goto('/api/auth/signout');
  await page.waitForLoadState('networkidle');
}
