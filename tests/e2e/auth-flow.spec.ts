import { test, expect } from '@playwright/test';
import { getTestDb, createTestUser, createTestProject } from './helpers/db';

test.describe('E2E: Authorization Flow', () => {
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

  test('powinien przejść pełny flow OAuth (Authorize -> Login -> Code -> Token)', async ({
    page,
    request,
  }) => {
    const redirectUri = 'http://localhost:3000/callback'; // Fake callback URL
    const authorizeUrl = `/authorize?client_id=${project.slug}&redirect_uri=${redirectUri}&response_type=code`;

    // 1. Wejście na /authorize
    await page.goto(authorizeUrl);

    // 2. Powinno przekierować na stronę logowania (root)
    await expect(page).toHaveURL(/http:\/\/localhost:\d+\/\?callbackUrl=.*/);

    // 3. Logowanie przez backdoor (window.e2eLogin)
    // Czekamy aż skrypt się załaduje i funkcja będzie dostępna
    await page.waitForFunction(() => typeof (window as any).e2eLogin === 'function');

    //console.log(`Logowanie jako: ${user.email}`);
    await page.evaluate((email) => {
      (window as any).e2eLogin(email);
    }, user.email);

    // 4. Czekamy na przekierowanie zwrotne do redirectUri z kodem
    // Playwright może zablokować nawigację do innej domeny/portu jeśli nie jest w base, ale tutaj przekierowujemy na localhost:3000/callback.
    // Jeśli nasza app działa na losowym porcie, a redirectUri jest na sztywno, to przeglądarka spróbuje tam wejść.
    // Ważne że URL w pasku adresu się zmieni.

    // Musimy przechwycić ten request lub zmianę URL.
    await page.waitForURL((url) => url.toString().startsWith(redirectUri));

    const url = new URL(page.url());
    const code = url.searchParams.get('code');
    expect(code).toBeTruthy();

    // 5. Wymiana kodu na token (Token Exchange)
    // Robimy to bezpośrednio requestem API, symulując backend klienta.

    const tokenResponse = await request.post('/api/v1/public/token', {
      data: {
        code,
        redirect_uri: redirectUri,
      },
    });

    expect(tokenResponse.status()).toBe(200);
    const tokenData = await tokenResponse.json();
    expect(tokenData.sessionToken).toBeDefined();
    expect(tokenData.user.email).toBe(user.email);
  });
});
