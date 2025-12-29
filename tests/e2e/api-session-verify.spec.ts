import { test, expect } from '@playwright/test';
import { getTestDb, createTestUser, createTestProject, insertAuthCode } from './helpers/db';

test.describe('E2E: API Session Verify', () => {
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

  test('powinien odrzucić weryfikację z nieprawidłowym tokenem', async ({ request }) => {
    const response = await request.post('/api/v1/public/session/verify', {
      data: {
        token: 'invalid-session-token-12345',
      },
    });

    // API może zwrócić 200 z valid: false lub 401
    const data = await response.json();
    if (response.status() === 200) {
      expect(data.valid).toBe(false);
    } else {
      expect(response.status()).toBe(401);
    }
  });

  test('powinien odrzucić weryfikację bez tokena', async ({ request }) => {
    const response = await request.post('/api/v1/public/session/verify', {
      data: {},
    });

    // API zwraca 400 z reason: 'missing_token'
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.reason).toBe('missing_token');
  });

  test('powinien zweryfikować poprawny token sesji projektu', async ({ request }) => {
    // Najpierw tworzymy sesję projektu i kod autoryzacyjny
    const authCode = `verify-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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

    // Wymieniamy kod na token
    const tokenResponse = await request.post('/api/v1/public/token', {
      data: {
        code: authCode,
        redirect_uri: redirectUri,
      },
    });
    expect(tokenResponse.status()).toBe(200);
    const tokenData = await tokenResponse.json();
    const sessionToken = tokenData.sessionToken;

    // Teraz weryfikujemy token
    const verifyResponse = await request.post('/api/v1/public/session/verify', {
      data: {
        token: sessionToken,
      },
    });

    // API zwraca tylko { valid: true } bez danych użytkownika
    expect(verifyResponse.status()).toBe(200);
    const verifyData = await verifyResponse.json();
    expect(verifyData.valid).toBe(true);
  });
});
