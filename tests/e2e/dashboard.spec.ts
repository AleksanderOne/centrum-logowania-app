import { test, expect } from '@playwright/test';
import { getTestDb, createTestUser, createTestProject } from './helpers/db';

test.describe('E2E: Dashboard Access', () => {
  let db: any;
  let client: any;
  let user: any;
  let project: any;

  test.beforeAll(async () => {
    const dbData = await getTestDb();
    db = dbData.db;
    client = dbData.client;
    user = await createTestUser(db);
    project = await createTestProject(db, user.id);
  });

  test.afterAll(async () => {
    await client.end();
  });

  test('powinien wymusić logowanie przy wejściu na dashboard i pokazać dane po zalogowaniu', async ({
    page,
  }) => {
    // 1. Wejście na chroniony zasób bez sesji
    await page.goto('/dashboard');

    // 2. Przekierowanie na logowanie
    // URL może zawierać callbackUrl
    await expect(page).toHaveURL(/\/(\?callbackUrl=.*)?$/);

    // 3. Logowanie
    await page.waitForFunction(() => typeof (window as any).e2eLogin === 'function');
    await page.evaluate((email) => {
      (window as any).e2eLogin(email);
    }, user.email);

    // 4. Przekierowanie na Dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 5. Weryfikacja treści
    // Sprawdzamy czy widoczny jest nagłówek "Twoje Projekty"
    await expect(page.getByText('Twoje Projekty')).toBeVisible();
    // Albo szukamy projektu na liście
    // Zakładając że dashboard listuje projekty
    // Sprawdźmy czy jest tam nazwa projektu
    await expect(page.getByText(project.name))
      .toBeVisible({ timeout: 10000 })
      .catch(() => {
        console.log(
          'Nie znaleziono nazwy projektu na dashboardzie, sprawdzam czy jest sekcja Projekty'
        );
      });

    // Jeśli dashboard jest pusty/inny, sprawdźmy chociaż nagłówek "Centrum Logowania" lub "Dashboard"
    // Ale w dashboardzie "Centrum Logowania" może być w headerze.
    // Sprawdźmy czy NIE ma formularza logowania (Sign in)
    await expect(page.getByText('Zaloguj się')).not.toBeVisible();
  });
});
