import { test, expect } from '@playwright/test';
import { getTestDb, createTestUser, createTestProject, insertAuthCode } from './helpers/db';

test.describe('E2E: API Token Exchange', () => {
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

  test('powinien odrzucić wymianę z nieprawidłowym kodem', async ({ request }) => {
    const response = await request.post('/api/v1/public/token', {
      data: {
        code: 'invalid-code-that-does-not-exist',
        redirect_uri: 'http://localhost:3000/callback',
      },
    });
    // API zwraca 400 z 'invalid_grant' dla nieprawidłowego lub brakującego kodu
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('powinien odrzucić wymianę bez kodu', async ({ request }) => {
    const response = await request.post('/api/v1/public/token', {
      data: {
        redirect_uri: 'http://localhost:3000/callback',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Missing');
  });

  test('powinien wymienić poprawny kod na token sesji', async ({ request }) => {
    // Wstrzykujemy kod autoryzacyjny bezpośrednio do bazy
    const authCode = `test-code-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const redirectUri = 'http://localhost:3000/callback';

    // Wstawiamy tylko wymagane pola (bez PKCE)
    await insertAuthCode(
      client,
      authCode,
      user.id,
      project.id,
      redirectUri,
      new Date(Date.now() + 5 * 60 * 1000)
    );

    // Teraz wymieniamy kod na token
    const response = await request.post('/api/v1/public/token', {
      data: {
        code: authCode,
        redirect_uri: redirectUri,
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.sessionToken).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(user.email);
  });

  test('powinien odrzucić ponowne użycie kodu', async ({ request }) => {
    // Tworzymy nowy kod
    const authCode = `reuse-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const redirectUri = 'http://localhost:3000/callback';

    // Wstawiamy tylko wymagane pola (bez PKCE)
    await insertAuthCode(
      client,
      authCode,
      user.id,
      project.id,
      redirectUri,
      new Date(Date.now() + 5 * 60 * 1000)
    );

    // Pierwsze użycie - powinno zadziałać
    const firstResponse = await request.post('/api/v1/public/token', {
      data: {
        code: authCode,
        redirect_uri: redirectUri,
      },
    });
    expect(firstResponse.status()).toBe(200);

    // Drugie użycie - kod już został zużyty, API zwraca 400 'invalid_grant'
    const secondResponse = await request.post('/api/v1/public/token', {
      data: {
        code: authCode,
        redirect_uri: redirectUri,
      },
    });
    expect(secondResponse.status()).toBe(400);
    const secondData = await secondResponse.json();
    expect(secondData.error).toBe('invalid_grant');
  });
});
