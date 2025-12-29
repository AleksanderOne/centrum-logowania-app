/**
 * Audit Logs Retention - Zarządzanie retencją logów audytu
 *
 * Pozwala na automatyczne czyszczenie starych logów oraz
 * konfigurację okresu przechowywania.
 */

import { db } from '@/lib/db/drizzle';
import { auditLogs, rateLimitEntries } from '@/lib/db/schema';
import { sql, lt, count } from 'drizzle-orm';

/**
 * Konfiguracja retencji (w dniach)
 */
export const RETENTION_DEFAULTS = {
  auditLogs: 90, // Logi audytu - 90 dni
  rateLimits: 1, // Rate limit entries - 1 dzień (wygasłe)
};

/**
 * Pobiera okres retencji z ENV lub używa domyślnego
 */
function getRetentionDays(): number {
  const envDays = process.env.AUDIT_LOGS_RETENTION_DAYS;
  if (envDays && !isNaN(parseInt(envDays))) {
    return parseInt(envDays);
  }
  return RETENTION_DEFAULTS.auditLogs;
}

export interface RetentionCleanupResult {
  auditLogsDeleted: number;
  rateLimitsDeleted: number;
  retentionDays: number;
  cutoffDate: Date;
  executedAt: Date;
}

/**
 * Czyści stare logi audytu
 *
 * @param olderThanDays - Opcjonalnie nadpisuje domyślny okres retencji
 */
export async function cleanupAuditLogs(olderThanDays?: number): Promise<number> {
  const days = olderThanDays ?? getRetentionDays();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await db.delete(auditLogs).where(lt(auditLogs.createdAt, cutoff));

  return (result as { rowCount?: number }).rowCount ?? 0;
}

/**
 * Czyści wygasłe wpisy rate limit
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const now = new Date();
  const result = await db.delete(rateLimitEntries).where(lt(rateLimitEntries.expiresAt, now));

  return (result as { rowCount?: number }).rowCount ?? 0;
}

/**
 * Wykonuje pełne czyszczenie retencji (audit logs + rate limits)
 */
export async function performRetentionCleanup(
  auditLogsDays?: number
): Promise<RetentionCleanupResult> {
  const retentionDays = auditLogsDays ?? getRetentionDays();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const auditLogsDeleted = await cleanupAuditLogs(retentionDays);
  const rateLimitsDeleted = await cleanupExpiredRateLimits();

  return {
    auditLogsDeleted,
    rateLimitsDeleted,
    retentionDays,
    cutoffDate: cutoff,
    executedAt: new Date(),
  };
}

/**
 * Pobiera statystyki logów audytu
 */
export async function getAuditLogsStats(): Promise<{
  totalCount: number;
  oldestLog: Date | null;
  newestLog: Date | null;
}> {
  const countResult = await db.select({ count: count() }).from(auditLogs);
  const total = countResult[0]?.count ?? 0;

  const oldest = await db
    .select({ createdAt: auditLogs.createdAt })
    .from(auditLogs)
    .orderBy(sql`${auditLogs.createdAt} ASC`)
    .limit(1);

  const newest = await db
    .select({ createdAt: auditLogs.createdAt })
    .from(auditLogs)
    .orderBy(sql`${auditLogs.createdAt} DESC`)
    .limit(1);

  return {
    totalCount: total,
    oldestLog: oldest[0]?.createdAt ?? null,
    newestLog: newest[0]?.createdAt ?? null,
  };
}
