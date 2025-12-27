/**
 * Audit Logger - Historia zdarzeń uwierzytelniania
 *
 * Zapisuje wszystkie istotne zdarzenia związane z bezpieczeństwem:
 * - Logowania (sukces/porażka)
 * - Wylogowania
 * - Wymiana kodów autoryzacyjnych
 * - Weryfikacje sesji
 * - Odmowy dostępu
 */

import { db } from '@/lib/db/drizzle';
import { auditLogs } from '@/lib/db/schema';

// Typy akcji audytu
export type AuditAction =
  | 'login' // Logowanie przez Google
  | 'logout' // Wylogowanie
  | 'token_exchange' // Wymiana kodu na token (OAuth2)
  | 'session_verify' // Weryfikacja sesji przez aplikację kliencką
  | 'token_verify' // Weryfikacja tokenu JWT
  | 'access_denied' // Odmowa dostępu (izolacja danych)
  | 'rate_limited' // Przekroczony limit requestów
  | 'kill_switch' // Unieważnienie sesji przez admina
  | 'project_access'; // Próba dostępu do projektu

export type AuditStatus = 'success' | 'failure';

export interface AuditLogEntry {
  userId?: string;
  projectId?: string;
  action: AuditAction;
  status: AuditStatus;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Zapisuje zdarzenie w logu audytu
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId || null,
      projectId: entry.projectId || null,
      action: entry.action,
      status: entry.status,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  } catch (error) {
    // Logujemy błąd ale nie przerywamy flow - audyt nie powinien blokować głównej logiki
    console.error('[AuditLogger] Failed to log event:', error, entry);
  }
}

/**
 * Helper do logowania sukcesu
 */
export async function logSuccess(
  action: AuditAction,
  opts: Omit<AuditLogEntry, 'action' | 'status'>
): Promise<void> {
  await logAuditEvent({ ...opts, action, status: 'success' });
}

/**
 * Helper do logowania porażki
 */
export async function logFailure(
  action: AuditAction,
  opts: Omit<AuditLogEntry, 'action' | 'status'>
): Promise<void> {
  await logAuditEvent({ ...opts, action, status: 'failure' });
}

/**
 * Pobiera informacje z requestu do logowania
 */
export function extractRequestInfo(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const forwarded = request.headers.get('x-forwarded-for');
  const ipAddress = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || 'unknown';

  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}
