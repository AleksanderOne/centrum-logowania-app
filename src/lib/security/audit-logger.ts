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
  | 'login' // Logowanie do CLA przez Google
  | 'logout' // Wylogowanie
  | 'token_exchange' // Wymiana kodu na token (OAuth2)
  | 'session_verify' // Weryfikacja sesji przez aplikację kliencką
  | 'token_verify' // Weryfikacja tokenu JWT
  | 'access_denied' // Odmowa dostępu (izolacja danych)
  | 'rate_limited' // Przekroczony limit requestów
  | 'kill_switch' // Unieważnienie sesji przez admina
  | 'sso_login' // Autoryzacja SSO - zalogowanie do projektu zewnętrznego
  | 'visibility_change' // Zmiana widoczności projektu (publiczny/prywatny)
  | 'member_add' // Dodanie członka do projektu
  | 'member_remove' // Usunięcie członka z projektu
  | 'project_create' // Utworzenie nowego projektu
  | 'project_delete' // Usunięcie projektu
  | 'setup_code' // Ogólna operacja na setup codes (legacy)
  | 'setup_code_generate' // Wygenerowanie nowego kodu setup
  | 'setup_code_delete' // Usunięcie kodu setup
  | 'setup_code_use' // Użycie kodu setup (claim)
  | 'session_delete' // Usunięcie sesji użytkownika
  | 'integration_test'; // Test integracji projektu

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
  } catch (error: unknown) {
    // Specjalna obsługa błędu FK Violation (code 23503)
    // Błąd może być bezpośrednio w obiekcie lub w .cause (node-postgres)
    const err = error as {
      code?: string;
      constraint?: string;
      cause?: { code?: string; constraint?: string };
    };
    const errorCode = err?.code || err?.cause?.code;
    const constraint = err?.constraint || err?.cause?.constraint || '';

    if (errorCode === '23503') {
      // Sprawdzamy, który FK jest naruszony
      const isUserFk =
        constraint.includes('user_id') || (entry.userId && !constraint.includes('project_id'));
      const isProjectFk = constraint.includes('project_id');

      if (process.env.NODE_ENV === 'development') {
        if (isUserFk && entry.userId) {
          console.warn(`[AuditLogger] User ${entry.userId} not found in DB. Logging as anonymous.`);
        }
        if (isProjectFk && entry.projectId) {
          console.warn(
            `[AuditLogger] Project ${entry.projectId} not found in DB. Logging without project reference.`
          );
        }
      }

      // Przygotuj nowe metadane z oryginalnymi ID
      const newMetadata: Record<string, unknown> = { ...(entry.metadata || {}) };
      let newUserId: string | null = entry.userId || null;
      let newProjectId: string | null = entry.projectId || null;

      // Obsługa FK violation dla user_id
      if (isUserFk && entry.userId) {
        newMetadata.originalUserId = entry.userId;
        newMetadata.fkViolationRef = 'user_id';
        newUserId = null;
      }

      // Obsługa FK violation dla project_id
      if (isProjectFk && entry.projectId) {
        newMetadata.originalProjectId = entry.projectId;
        newMetadata.fkViolationRef = isUserFk ? 'user_id,project_id' : 'project_id';
        newProjectId = null;
      }

      // Próbujemy zapisać ponownie bez powiązań, które naruszają FK
      try {
        await db.insert(auditLogs).values({
          userId: newUserId,
          projectId: newProjectId,
          action: entry.action,
          status: entry.status,
          ipAddress: entry.ipAddress || null,
          userAgent: entry.userAgent || null,
          metadata: JSON.stringify(newMetadata),
        });
        return; // Sukces przy drugim podejściu
      } catch (retryError) {
        console.error('[AuditLogger] Failed to log event (retry):', retryError, entry);
      }
    } else {
      // Inne błędy logujemy normalnie
      // Logujemy błąd ale nie przerywamy flow - audyt nie powinien blokować głównej logiki
      console.error('[AuditLogger] Failed to log event:', error, entry);
    }
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
