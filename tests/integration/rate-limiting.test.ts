/** @vitest-environment node */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { testDb, cleanupTestData } from './helpers/db-helper';

// Przekierowujemy bazę danych projektu na naszą in-memory testDb
vi.mock('@/lib/db/drizzle', () => ({
  db: testDb,
}));

import { checkRateLimit } from '@/lib/security/rate-limiter';
import { rateLimitEntries } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Integracja: Rate Limiting (z silnikiem PGlite)', () => {
  beforeAll(async () => {
    const { initializeTestDb } = await import('./helpers/db-helper');
    await initializeTestDb();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('powinien blokować requesty po przekroczeniu limitu w bazie danych', async () => {
    const testKey = `ip:127.0.0.1:test-endpoint-${Math.random()}`;
    const limit = 3; // Niestandardowy mały limit dla testu
    const config = { windowMs: 1000, maxRequests: limit };

    // // console.log(`🔹 Test Rate Limit: ${testKey}, limit: ${limit}`);

    // Pierwsze 3 requesty powinny być dozwolone
    for (let i = 1; i <= limit; i++) {
      const result = await checkRateLimit(testKey, config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - i);

      // Sprawdź w bazie czy licznik się zgadza
      const dbEntry = await testDb.query.rateLimitEntries.findFirst({
        where: eq(rateLimitEntries.key, testKey),
      });
      expect(dbEntry?.count).toBe(i);
    }

    // 4-ty request powinien zostać zablokowany
    const blockedResult = await checkRateLimit(testKey, config);
    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.remaining).toBe(0);
    expect(blockedResult.retryAfterMs).toBeGreaterThan(0);
  });

  it('powinien izolować limity dla różnych kluczy', async () => {
    const config = { windowMs: 1000, maxRequests: 5 };
    const keyA = `ip:1.1.1.1:api`;
    const keyB = `ip:2.2.2.2:api`;

    // Blokujemy klucz A
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(keyA, config);
    }
    const resA = await checkRateLimit(keyA, config);
    expect(resA.allowed).toBe(false);

    // Klucz B powinien nadal być dozwolony
    const resB = await checkRateLimit(keyB, config);
    expect(resB.allowed).toBe(true);
    expect(resB.remaining).toBe(4);
  });

  it('powinien pozwolić na ponowny dostęp po wygaśnięciu okna czasowego', async () => {
    const windowMs = 500;
    const config = { windowMs, maxRequests: 1 };
    const testKey = `ip:wait:test`;

    // 1. Pierwszy request
    await checkRateLimit(testKey, config);

    // 2. Drugi request - zablokowany
    const res2 = await checkRateLimit(testKey, config);
    expect(res2.allowed).toBe(false);

    // // console.log('🔹 Czekanie na wygaśnięcie okna (550ms)...');

    // 3. Czekamy na wygaśnięcie okna
    await new Promise((resolve) => setTimeout(resolve, 550));

    // 4. Trzeci request - powinien być dozwolony (nowe okno)
    const res3 = await checkRateLimit(testKey, config);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });
});
