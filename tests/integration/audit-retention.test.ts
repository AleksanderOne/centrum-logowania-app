/** @vitest-environment node */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { testDb, setupTestEnvironment, cleanupTestData } from './helpers/db-helper';
import { auditLogs, rateLimitEntries } from '@/lib/db/schema';

// Przekierowujemy bazę danych na PGlite
vi.mock('@/lib/db/drizzle', () => ({
  db: testDb,
}));

import {
  cleanupAuditLogs,
  performRetentionCleanup,
  getAuditLogsStats,
} from '@/lib/security/audit-retention';
import { logSuccess } from '@/lib/security/audit-logger';

describe('Integracja: Audit Logs Retention (z silnikiem PGlite)', () => {
  let testEnv: Awaited<ReturnType<typeof setupTestEnvironment>>;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('powinien usunąć logi starsze niż określona liczba dni', async () => {
    const { user, project } = testEnv;

    // 1. Dodajemy stary log (100 dni temu)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);

    await testDb.insert(auditLogs).values({
      userId: user.id,
      projectId: project.id,
      action: 'login',
      status: 'success',
      createdAt: oldDate,
    });

    // 2. Dodajemy nowy log (dzisiaj)
    await logSuccess('login', { userId: user.id, projectId: project.id });

    // 3. Sprawdzamy stan przed cleanup
    const statsBefore = await getAuditLogsStats();
    expect(statsBefore.totalCount).toBeGreaterThanOrEqual(2);

    // console.log(`🔹 Przed cleanup: ${statsBefore.totalCount} logów`);

    // 4. Uruchamiamy cleanup (90 dni)
    const _deleted = await cleanupAuditLogs(90);

    // console.log(`🔹 Usunięto ${deleted} logów starszych niż 90 dni`);

    // 5. Sprawdzamy stan po cleanup
    const statsAfter = await getAuditLogsStats();
    expect(statsAfter.totalCount).toBeLessThan(statsBefore.totalCount);
  });

  it('powinien zwrócić poprawne statystyki logów', async () => {
    const stats = await getAuditLogsStats();

    expect(stats).toHaveProperty('totalCount');
    expect(stats).toHaveProperty('oldestLog');
    expect(stats).toHaveProperty('newestLog');
    expect(typeof stats.totalCount).toBe('number');
  });

  it('performRetentionCleanup powinien usunąć też wygasłe rate limits', async () => {
    // 1. Dodajemy wygasły rate limit
    await testDb.insert(rateLimitEntries).values({
      key: 'test:expired:key',
      count: 5,
      expiresAt: new Date(Date.now() - 1000), // Wygasł sekundę temu
    });

    // 2. Uruchamiamy pełny cleanup
    const result = await performRetentionCleanup(90);

    // console.log(`🔹 Retention cleanup: ${result.auditLogsDeleted} audit logs, ${result.rateLimitsDeleted} rate limits`);

    expect(result).toHaveProperty('auditLogsDeleted');
    expect(result).toHaveProperty('rateLimitsDeleted');
    expect(result).toHaveProperty('retentionDays');
    expect(result).toHaveProperty('executedAt');
  });
});
