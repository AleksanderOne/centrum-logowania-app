/** @vitest-environment node */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { testDb, setupTestEnvironment, cleanupTestData } from './helpers/db-helper';
import { generatePKCEPair } from '@/lib/security/pkce';

// Przekierowujemy bazę danych na PGlite
vi.mock('@/lib/db/drizzle', () => ({
  db: testDb,
}));

import { POST as publicTokenHandler } from '@/app/api/v1/public/token/route';
import { NextRequest } from 'next/server';
import { authorizationCodes } from '@/lib/db/schema';

describe('Integracja: PKCE Validation (z silnikiem PGlite)', () => {
  let testEnv: Awaited<ReturnType<typeof setupTestEnvironment>>;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('powinien przejść wymianę tokena z poprawnym PKCE', async () => {
    const { user, project } = testEnv;
    const { codeVerifier, codeChallenge } = generatePKCEPair();
    const testCode = `pkce_code_success_${Math.random().toString(36).substring(7)}`;
    const redirectUri = 'http://localhost/callback';

    // 1. Zapisujemy kod z challenge w bazie
    await testDb.insert(authorizationCodes).values({
      code: testCode,
      userId: user.id,
      projectId: project.id,
      redirectUri: redirectUri,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      codeChallenge: codeChallenge,
      codeChallengeMethod: 'S256',
    });

    // console.log(`🔹 Krok 1: Wymiana z poprawnym verifier: ${codeVerifier.substring(0, 10)}...`);

    // 2. Próba wymiany z poprawnym verifierem
    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({
        code: testCode,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const res = await publicTokenHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sessionToken).toBeDefined();
  });

  it('powinien odrzucić wymianę z niepoprawnym code_verifierem', async () => {
    const { user, project } = testEnv;
    const { codeChallenge } = generatePKCEPair();
    const testCode = `pkce_code_fail_${Math.random().toString(36).substring(7)}`;
    const redirectUri = 'http://localhost/callback';

    // 1. Zapisujemy kod
    await testDb.insert(authorizationCodes).values({
      code: testCode,
      userId: user.id,
      projectId: project.id,
      redirectUri: redirectUri,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      codeChallenge: codeChallenge,
      codeChallengeMethod: 'S256',
    });

    // console.log('🔹 Krok 2: Próba wymiany ze złym verifierem...');

    // 2. Próba wymiany ze złym verifierem
    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({
        code: testCode,
        redirect_uri: redirectUri,
        code_verifier: 'invalid_verifier_that_is_at_least_43_characters_long_for_validation',
      }),
    });

    const res = await publicTokenHandler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid_grant');
    expect(data.error_description).toBe('Invalid code_verifier');
  });

  it('powinien odrzucić wymianę jeśli PKCE jest wymagane a brakuje code_verifier', async () => {
    const { user, project } = testEnv;
    const { codeChallenge } = generatePKCEPair();
    const testCode = `pkce_code_missing_${Math.random().toString(36).substring(7)}`;
    const redirectUri = 'http://localhost/callback';

    await testDb.insert(authorizationCodes).values({
      code: testCode,
      userId: user.id,
      projectId: project.id,
      redirectUri: redirectUri,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      codeChallenge: codeChallenge,
      codeChallengeMethod: 'S256',
    });

    // console.log('🔹 Krok 3: Próba wymiany bez verifiera...');

    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({
        code: testCode,
        redirect_uri: redirectUri,
        // brakuje code_verifier
      }),
    });

    const res = await publicTokenHandler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error_description).toContain('code_verifier is required');
  });
});
