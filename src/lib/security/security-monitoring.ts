/**
 * Security Monitoring - System wykrywania zagrożeń i alertów
 *
 * Monitoruje logi audytu pod kątem podejrzanych wzorców i generuje alerty.
 */

import { db } from '@/lib/db/drizzle';
import { auditLogs } from '@/lib/db/schema';
import { eq, and, gte, count, sql } from 'drizzle-orm';

export type SecurityAlertLevel = 'info' | 'warning' | 'critical';

export interface SecurityAlert {
  id: string;
  level: SecurityAlertLevel;
  type: string;
  message: string;
  details: Record<string, unknown>;
  detectedAt: Date;
}

export interface SecurityMetrics {
  totalLogins24h: number;
  failedLogins24h: number;
  successRate: number;
  uniqueIPs24h: number;
  rateLimitHits24h: number;
  bruteForceAttempts24h: number;
}

/**
 * Progi alertów
 */
const ALERT_THRESHOLDS = {
  failedLoginsPerHour: 10, // Więcej = warning
  failedLoginsPerHourCritical: 25, // Więcej = critical
  uniqueFailedIPsPerHour: 5, // Więcej = warning (możliwy atak rozproszony)
  bruteForceAttemptsPerHour: 3, // Więcej = critical
};

/**
 * Pobiera metryki bezpieczeństwa z ostatnich 24h
 */
export async function getSecurityMetrics(): Promise<SecurityMetrics> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Total logins
  const totalLogins = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(and(eq(auditLogs.action, 'login'), gte(auditLogs.createdAt, oneDayAgo)));

  // Failed logins
  const failedLogins = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, 'login'),
        eq(auditLogs.status, 'failure'),
        gte(auditLogs.createdAt, oneDayAgo)
      )
    );

  // Unique IPs with failures
  const uniqueFailedIPs = await db
    .select({ ip: auditLogs.ipAddress })
    .from(auditLogs)
    .where(and(eq(auditLogs.status, 'failure'), gte(auditLogs.createdAt, oneDayAgo)))
    .groupBy(auditLogs.ipAddress);

  // Rate limit hits
  const rateLimitHits = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(and(eq(auditLogs.action, 'rate_limited'), gte(auditLogs.createdAt, oneDayAgo)));

  // Brute force (metadata zawiera 'brute_force')
  const bruteForce = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.createdAt, oneDayAgo),
        sql`${auditLogs.metadata}::text LIKE '%brute_force%'`
      )
    );

  const total = totalLogins[0]?.count || 0;
  const failed = failedLogins[0]?.count || 0;

  return {
    totalLogins24h: total,
    failedLogins24h: failed,
    successRate: total > 0 ? ((total - failed) / total) * 100 : 100,
    uniqueIPs24h: uniqueFailedIPs.length,
    rateLimitHits24h: rateLimitHits[0]?.count || 0,
    bruteForceAttempts24h: bruteForce[0]?.count || 0,
  };
}

/**
 * Wykrywa aktywne zagrożenia bezpieczeństwa
 */
export async function detectSecurityThreats(): Promise<SecurityAlert[]> {
  const alerts: SecurityAlert[] = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // 1. Sprawdź nieudane logowania w ostatniej godzinie
  const failedLoginsHour = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, 'login'),
        eq(auditLogs.status, 'failure'),
        gte(auditLogs.createdAt, oneHourAgo)
      )
    );

  const failedCount = failedLoginsHour[0]?.count || 0;

  if (failedCount >= ALERT_THRESHOLDS.failedLoginsPerHourCritical) {
    alerts.push({
      id: `failed-logins-critical-${now.getTime()}`,
      level: 'critical',
      type: 'excessive_failed_logins',
      message: `Wykryto ${failedCount} nieudanych prób logowania w ostatniej godzinie`,
      details: { count: failedCount, threshold: ALERT_THRESHOLDS.failedLoginsPerHourCritical },
      detectedAt: now,
    });
  } else if (failedCount >= ALERT_THRESHOLDS.failedLoginsPerHour) {
    alerts.push({
      id: `failed-logins-warning-${now.getTime()}`,
      level: 'warning',
      type: 'elevated_failed_logins',
      message: `Zwiększona liczba nieudanych logowań: ${failedCount} w ostatniej godzinie`,
      details: { count: failedCount, threshold: ALERT_THRESHOLDS.failedLoginsPerHour },
      detectedAt: now,
    });
  }

  // 2. Sprawdź unikalne IP z nieudanymi logowaniami
  const uniqueFailedIPs = await db
    .select({ ip: auditLogs.ipAddress })
    .from(auditLogs)
    .where(and(eq(auditLogs.status, 'failure'), gte(auditLogs.createdAt, oneHourAgo)))
    .groupBy(auditLogs.ipAddress);

  if (uniqueFailedIPs.length >= ALERT_THRESHOLDS.uniqueFailedIPsPerHour) {
    alerts.push({
      id: `distributed-attack-${now.getTime()}`,
      level: 'warning',
      type: 'possible_distributed_attack',
      message: `Wykryto nieudane logowania z ${uniqueFailedIPs.length} różnych adresów IP`,
      details: { uniqueIPs: uniqueFailedIPs.length },
      detectedAt: now,
    });
  }

  // 3. Sprawdź brute force
  const bruteForceHour = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.createdAt, oneHourAgo),
        sql`${auditLogs.metadata}::text LIKE '%brute_force%'`
      )
    );

  const bruteForceCount = bruteForceHour[0]?.count || 0;

  if (bruteForceCount >= ALERT_THRESHOLDS.bruteForceAttemptsPerHour) {
    alerts.push({
      id: `brute-force-${now.getTime()}`,
      level: 'critical',
      type: 'brute_force_detected',
      message: `Wykryto ${bruteForceCount} prób brute force w ostatniej godzinie!`,
      details: { count: bruteForceCount },
      detectedAt: now,
    });
  }

  return alerts;
}

/**
 * Generuje raport bezpieczeństwa
 */
export async function generateSecurityReport(): Promise<{
  metrics: SecurityMetrics;
  alerts: SecurityAlert[];
  generatedAt: Date;
  status: 'healthy' | 'warning' | 'critical';
}> {
  const metrics = await getSecurityMetrics();
  const alerts = await detectSecurityThreats();

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';

  if (alerts.some((a) => a.level === 'critical')) {
    status = 'critical';
  } else if (alerts.some((a) => a.level === 'warning')) {
    status = 'warning';
  }

  return {
    metrics,
    alerts,
    generatedAt: new Date(),
    status,
  };
}
