/** @vitest-environment node */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { testDb, setupTestEnvironment, cleanupTestData } from './helpers/db-helper';
import { projectSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { signSessionToken } from '@/lib/jwt';

// Przekierowujemy bazę danych na PGlite
vi.mock('@/lib/db/drizzle', () => ({
  db: testDb,
}));

import { POST as verifyHandler } from '@/app/api/v1/public/session/verify/route';
import { NextRequest } from 'next/server';

describe('Integracja: Idle Session Timeout (z silnikiem PGlite)', () => {
  let testEnv: Awaited<ReturnType<typeof setupTestEnvironment>>;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('powinien unieważnić sesję po 31 minutach bezczynności', async () => {
    const { user, project } = testEnv;

    // 1. Tworzymy sesję w DB, która "wygasła" (31 min temu)
    const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000);

    await testDb.insert(projectSessions).values({
      userId: user.id,
      projectId: project.id,
      userEmail: user.email,
      userName: user.name,
      lastSeenAt: thirtyOneMinutesAgo,
      ipAddress: '127.0.0.1',
    });

    // 2. Generujemy token dla tej sesji
    const token = await signSessionToken({
      userId: user.id,
      projectId: project.id,
      tokenVersion: user.tokenVersion || 1,
    });

    // console.log('🔹 Test Idle Timeout: Próba weryfikacji starej sesji (31 min)');

    // 3. Próba weryfikacji
    const req = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    const res = await verifyHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.reason).toBe('idle_timeout');
  });

  it('powinien przedłużyć sesję, jeśli użytkownik jest aktywny', async () => {
    const { user, project } = testEnv;

    // Czyścimy poprzednie i tworzymy nową aktywną sesję (5 min temu)
    await testDb.delete(projectSessions);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    await testDb.insert(projectSessions).values({
      userId: user.id,
      projectId: project.id,
      userEmail: user.email,
      userName: user.name,
      lastSeenAt: fiveMinutesAgo,
      ipAddress: '127.0.0.1',
    });

    const token = await signSessionToken({
      userId: user.id,
      projectId: project.id,
      tokenVersion: user.tokenVersion || 1,
    });

    // console.log('🔹 Test Idle Timeout: Weryfikacja aktywnej sesji (5 min)');

    const req = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    const res = await verifyHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.valid).toBe(true);

    // Sprawdzamy czy lastSeenAt w bazie został zaktualizowany
    const session = await testDb.query.projectSessions.findFirst({
      where: eq(projectSessions.userId, user.id),
    });

    expect(session?.lastSeenAt!.getTime()).toBeGreaterThan(fiveMinutesAgo.getTime());
  });
});
