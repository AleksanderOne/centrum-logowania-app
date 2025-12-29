/** @vitest-environment node */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { testDb, setupTestEnvironment, cleanupTestData } from './helpers/db-helper';
import { projects, authorizationCodes, projectUsers } from '@/lib/db/schema';

// Przekierowujemy bazę danych na PGlite
vi.mock('@/lib/db/drizzle', () => ({
  db: testDb,
}));

import { POST as privateTokenHandler } from '@/app/api/v1/token/route';
import { POST as publicTokenHandler } from '@/app/api/v1/public/token/route';
import { NextRequest } from 'next/server';

describe('Integracja: Project Isolation & Data Security', () => {
  let testEnv: Awaited<ReturnType<typeof setupTestEnvironment>>;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('powinien zablokować dostęp do prywatnego projektu dla użytkownika bez uprawnień', async () => {
    const { user } = testEnv;

    // 1. Tworzymy nowy prywatny projekt
    const [privateProject] = await testDb
      .insert(projects)
      .values({
        name: 'Private Project',
        slug: `test-private-${Math.random().toString(36).substring(7)}`,
        apiKey: `key_private_${Math.random().toString(36).substring(7)}`,
        ownerId: user.id, // Użytkownik jest właścicielem, ale checkProjectAccess sprawdza tabelę project_users dla prywatnych
        isPublic: 'false',
      })
      .returning();

    // 2. Tworzymy kod autoryzacyjny dla tego projektu
    const testCode = `code_private_fail_${Math.random().toString(36).substring(7)}`;
    await testDb.insert(authorizationCodes).values({
      code: testCode,
      userId: user.id,
      projectId: privateProject.id,
      redirectUri: 'http://localhost/callback',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // console.log(`🔹 Test izolacji: Próba dostępu do prywatnego projektu ${privateProject.name}`);

    // 3. Próba wymiany kodu przez publiczny endpoint
    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({
        code: testCode,
        redirect_uri: 'http://localhost/callback',
      }),
    });

    const res = await publicTokenHandler(req);
    const data = await res.json();

    // Powinien zwrócić 403 Forbidden
    expect(res.status).toBe(403);
    expect(data.error).toContain('Access denied');
  });

  it('powinien pozwolić na dostęp do prywatnego projektu jeśli użytkownik jest w project_users', async () => {
    const { user } = testEnv;

    // 1. Tworzymy projekt prywatny
    const [privateProject] = await testDb
      .insert(projects)
      .values({
        name: 'Allowed Private Project',
        slug: `test-allowed-${Math.random().toString(36).substring(7)}`,
        apiKey: `key_allowed_${Math.random().toString(36).substring(7)}`,
        ownerId: user.id,
        isPublic: 'false',
      })
      .returning();

    // 2. DODAJEMY użytkownika do projektu
    await testDb.insert(projectUsers).values({
      userId: user.id,
      projectId: privateProject.id,
      role: 'member',
    });

    const testCode = `code_private_success_${Math.random().toString(36).substring(7)}`;
    await testDb.insert(authorizationCodes).values({
      code: testCode,
      userId: user.id,
      projectId: privateProject.id,
      redirectUri: 'http://localhost/callback',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // console.log('🔹 Test izolacji: Dostęp dozwolony po dodaniu do project_users');

    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({
        code: testCode,
        redirect_uri: 'http://localhost/callback',
      }),
    });

    const res = await publicTokenHandler(req);
    expect(res.status).toBe(200);
  });

  it('powinien zablokować użycie klucza API Projektu A do wymiany kodu z Projektu B', async () => {
    const { user, project: projectA } = testEnv;

    // 1. Tworzymy inny projekt (Projekt B)
    const [projectB] = await testDb
      .insert(projects)
      .values({
        name: 'Project B',
        slug: `project-b-${Math.random().toString(36).substring(7)}`,
        apiKey: `key_b_${Math.random().toString(36).substring(7)}`,
        ownerId: user.id,
        isPublic: 'true',
      })
      .returning();

    // 2. Generujemy kod dla Projektu B
    const codeForB = `code_for_b_${Math.random().toString(36).substring(7)}`;
    await testDb.insert(authorizationCodes).values({
      code: codeForB,
      userId: user.id,
      projectId: projectB.id,
      redirectUri: 'http://localhost/callback',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // console.log('🔹 Test izolacji: Próba użycia API Key Projektu A dla kodu z Projektu B');

    // 3. Próbujemy wymienić kod B używając API Key projektu A
    const req = new NextRequest('http://localhost/api/v1/token', {
      method: 'POST',
      headers: {
        'x-api-key': projectA.apiKey!,
      },
      body: JSON.stringify({
        code: codeForB,
        redirect_uri: 'http://localhost/callback',
      }),
    });

    const res = await privateTokenHandler(req);
    const data = await res.json();

    // Powinien zwrócić 401 lub 400 (Invalid code bo kod nie należy do projektu zidentyfikowanego przez API Key)
    expect(res.status).toBe(401);
    expect(data.error).toContain('Invalid or already used');
  });
});
