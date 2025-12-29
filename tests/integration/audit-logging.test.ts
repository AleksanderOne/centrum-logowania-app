/** @vitest-environment node */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { testDb, setupTestEnvironment, cleanupTestData } from './helpers/db-helper';

// Przekierowujemy bazę danych projektu na naszą in-memory testDb
vi.mock('@/lib/db/drizzle', () => ({
  db: testDb,
}));

import { logSuccess, logFailure } from '@/lib/security/audit-logger';
import { auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Integracja: Audit Logging (z silnikiem PGlite)', () => {
  let testEnv: Awaited<ReturnType<typeof setupTestEnvironment>>;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('powinien zapisywać sukcesy w tabeli audit_log z pełnymi metadanymi', async () => {
    const { user, project } = testEnv;
    const metadata = { details: 'integration test', testId: Math.random().toString() };

    // console.log(`🔹 Test Audit Log (Success) dla user: ${user.email}`);

    await logSuccess('login', {
      userId: user.id,
      projectId: project.id,
      ipAddress: '127.0.0.1',
      userAgent: 'Integration Tester',
      metadata,
    });

    // Sprawdź w bazie
    const logs = await testDb.select().from(auditLogs).where(eq(auditLogs.userId, user.id));

    expect(logs).toHaveLength(1);
    const log = logs[0];
    expect(log.action).toBe('login');
    expect(log.status).toBe('success');
    expect(log.projectId).toBe(project.id);
    expect(log.ipAddress).toBe('127.0.0.1');

    // Sprawdź metadata (w bazie jest jako stringified JSON)
    const logMetadata = JSON.parse(log.metadata || '{}');
    expect(logMetadata.details).toBe(metadata.details);
    expect(logMetadata.testId).toBe(metadata.testId);
  });

  it('powinien zapisywać błędy w tabeli audit_log', async () => {
    const { user, project } = testEnv;
    const errorReason = 'invalid_password';

    // console.log('🔹 Test Audit Log (Failure)');

    await logFailure('login', {
      userId: user.id,
      projectId: project.id,
      ipAddress: '8.8.8.8',
      metadata: { reason: errorReason },
    });

    // Sprawdź w bazie
    const logs = await testDb.select().from(auditLogs).where(eq(auditLogs.ipAddress, '8.8.8.8'));

    expect(logs).toHaveLength(1);
    const log = logs[0];
    expect(log.status).toBe('failure');

    const logMetadata = JSON.parse(log.metadata || '{}');
    expect(logMetadata.reason).toBe(errorReason);
  });

  it('powinien obsługiwać logowanie bez userId (np. nieudane logowanie)', async () => {
    // console.log('🔹 Test Audit Log (No User)');

    await logFailure('rate_limited', {
      ipAddress: '192.168.1.1',
      metadata: { reason: 'testing anonymous' },
    });

    const logs = await testDb
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.ipAddress, '192.168.1.1'));

    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBeNull();
    expect(logs[0].action).toBe('rate_limited');
  });
});
