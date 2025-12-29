/** @vitest-environment node */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { testDb, setupTestEnvironment, cleanupTestData } from './helpers/db-helper';

// KLUCZOWY MOMENT: Przekierowujemy domyślną bazę danych projektu na naszą in-memory testDb
vi.mock('@/lib/db/drizzle', () => ({
  db: testDb,
}));

// Importujemy handlery DOPIERO PO mocku bazy
import { POST as tokenExchangeHandler } from '@/app/api/v1/public/token/route';
import { POST as verifySessionHandler } from '@/app/api/v1/public/session/verify/route';
import { NextRequest } from 'next/server';
import { authorizationCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Integracja: Full OAuth Flow (z silnikiem PGlite)', () => {
  let testEnv: Awaited<ReturnType<typeof setupTestEnvironment>>;

  beforeAll(async () => {
    // Zainicjalizuj i przygotuj dane
    testEnv = await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('powinien przejść pełny flow: Code Exchange -> Session Verify', async () => {
    const { user, project } = testEnv;

    // 1. Tworzymy kod autoryzacyjny w bazie dla naszego użytkownika i projektu
    const testCode = `test_code_${Math.random().toString(36).substring(7)}`;
    const redirectUri = 'http://localhost/callback'; // Musi pasować do formatu URL

    await testDb.insert(authorizationCodes).values({
      code: testCode,
      userId: user.id,
      projectId: project.id,
      redirectUri: redirectUri,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // console.log('🔹 Krok 1: Wymiana kodu na token...');

    const exchangeRequest = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({
        code: testCode,
        redirect_uri: redirectUri,
      }),
    });

    const exchangeResponse = await tokenExchangeHandler(exchangeRequest);
    const exchangeData = await exchangeResponse.json();

    // Weryfikacja odpowiedzi
    if (exchangeResponse.status !== 200) {
      console.error('Błąd exchange:', exchangeData);
    }
    expect(exchangeResponse.status).toBe(200);
    expect(exchangeData.sessionToken).toBeDefined();

    // Weryfikacja w bazie PGlite
    const usedCode = await testDb.query.authorizationCodes.findFirst({
      where: eq(authorizationCodes.code, testCode),
    });
    expect(usedCode?.usedAt).not.toBeNull();

    const sessionToken = exchangeData.sessionToken;

    // console.log('🔹 Krok 2: Weryfikacja otrzymanego tokena sesji...');

    const verifyRequest = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({
        token: sessionToken,
      }),
    });

    const verifyResponse = await verifySessionHandler(verifyRequest);
    const verifyData = await verifyResponse.json();

    expect(verifyResponse.status).toBe(200);
    expect(verifyData.valid).toBe(true);
  });
});
