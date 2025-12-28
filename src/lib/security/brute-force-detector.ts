/**
 * Brute Force Detection - Wykrywanie ataków brute force
 *
 * Monitoruje nieudane próby logowania/autoryzacji i wykrywa podejrzane wzorce
 */

import { db } from '@/lib/db/drizzle';
import { auditLogs } from '@/lib/db/schema';
import { eq, and, gte, count, sql } from 'drizzle-orm';

export interface BruteForceCheck {
  isBruteForce: boolean;
  attempts: number;
  windowStart: Date;
  retryAfter?: number; // Sekundy do ponowienia
}

/**
 * Próg prób brute force (nieudane próby w oknie czasowym)
 */
const BRUTE_FORCE_THRESHOLD = 5; // 5 nieudanych prób
const BRUTE_FORCE_WINDOW_MS = 15 * 60 * 1000; // 15 minut

/**
 * Sprawdza czy dla danego identyfikatora (IP lub email) wykryto brute force
 *
 * @param identifier - IP address lub email
 * @param action - Typ akcji do sprawdzenia (np. 'login', 'token_exchange')
 * @returns Informacja o wykryciu brute force
 */
export async function checkBruteForce(
  identifier: string,
  action: 'login' | 'token_exchange' | 'verify' = 'login'
): Promise<BruteForceCheck> {
  const cutoff = new Date(Date.now() - BRUTE_FORCE_WINDOW_MS);

  // Policz nieudane próby w oknie czasowym
  // Sprawdź po IP address (dla login) lub po kombinacji IP+action
  const failures = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.status, 'failure'),
        eq(auditLogs.action, action),
        gte(auditLogs.createdAt, cutoff),
        // Sprawdź czy IP pasuje (identifier to IP) lub email w metadata
        sql`${auditLogs.ipAddress} = ${identifier} OR ${auditLogs.metadata}::text LIKE ${'%' + identifier + '%'}`
      )
    );

  const attemptCount = failures[0] ? failures[0].count || 0 : 0;
  const isBruteForce = attemptCount >= BRUTE_FORCE_THRESHOLD;

  // Oblicz kiedy można ponowić próbę
  let retryAfter: number | undefined;
  if (isBruteForce) {
    // Znajdź najstarszą próbę w oknie
    const oldestFailure = await db
      .select({ createdAt: auditLogs.createdAt })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.status, 'failure'),
          eq(auditLogs.action, action),
          sql`${auditLogs.ipAddress} = ${identifier}`
        )
      )
      .orderBy(auditLogs.createdAt)
      .limit(1);

    if (oldestFailure[0]?.createdAt) {
      const oldestTime = oldestFailure[0].createdAt.getTime();
      const windowEnd = oldestTime + BRUTE_FORCE_WINDOW_MS;
      retryAfter = Math.max(0, Math.ceil((windowEnd - Date.now()) / 1000));
    }
  }

  return {
    isBruteForce,
    attempts: attemptCount,
    windowStart: cutoff,
    retryAfter,
  };
}

/**
 * Sprawdza brute force po IP address
 */
export async function checkBruteForceByIp(
  ipAddress: string,
  action: 'login' | 'token_exchange' | 'verify' = 'login'
): Promise<BruteForceCheck> {
  return checkBruteForce(ipAddress, action);
}

/**
 * Sprawdza brute force po email (dla login attempts)
 */
export async function checkBruteForceByEmail(
  email: string,
  action: 'login' | 'token_exchange' | 'verify' = 'login'
): Promise<BruteForceCheck> {
  return checkBruteForce(email, action);
}

/**
 * Czyści stare logi audytu (można uruchomić przez cron)
 *
 * @param olderThanDays - Usuń logi starsze niż X dni
 */
export async function cleanupOldAuditLogs(olderThanDays: number = 90): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  // Użyj raw SQL dla DELETE z WHERE (Drizzle może mieć ograniczenia)
  const result = await db.delete(auditLogs).where(sql`${auditLogs.createdAt} < ${cutoff}`);

  return (result as { rowCount?: number }).rowCount || 0;
}
