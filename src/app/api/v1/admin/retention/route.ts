import { NextRequest, NextResponse } from 'next/server';
import { performRetentionCleanup, getAuditLogsStats, logSuccess, logFailure } from '@/lib/security';

/**
 * Admin API: Retention Cleanup
 *
 * Uruchamia czyszczenie starych logów audytu i wygasłych rate limits.
 * Chroniony przez ADMIN_API_KEY (do użycia przez cron job lub ręcznie).
 *
 * POST /api/v1/admin/retention
 * Headers: x-admin-key: ADMIN_API_KEY (z ENV)
 * Body (opcjonalne): { "retentionDays": 90 }
 *
 * GET /api/v1/admin/retention
 * Headers: x-admin-key: ADMIN_API_KEY
 * Zwraca statystyki logów audytu.
 */

function isAuthorized(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    // Jeśli nie skonfigurowano klucza, blokuj dostęp
    return false;
  }

  const providedKey = req.headers.get('x-admin-key');
  return providedKey === adminKey;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    await logFailure('access_denied', {
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      metadata: { endpoint: 'admin/retention', reason: 'invalid_admin_key' },
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let retentionDays: number | undefined;

    // Opcjonalnie: nadpisz okres retencji z body
    try {
      const body = await req.json();
      if (body.retentionDays && typeof body.retentionDays === 'number') {
        retentionDays = body.retentionDays;
      }
    } catch {
      // Body może być puste - OK
    }

    const result = await performRetentionCleanup(retentionDays);

    await logSuccess('setup_code', {
      metadata: {
        action: 'retention_cleanup',
        auditLogsDeleted: result.auditLogsDeleted,
        rateLimitsDeleted: result.rateLimitsDeleted,
        retentionDays: result.retentionDays,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Retention] Cleanup error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getAuditLogsStats();

    return NextResponse.json({
      success: true,
      stats,
      retentionDays: parseInt(process.env.AUDIT_LOGS_RETENTION_DAYS || '90'),
    });
  } catch (error) {
    console.error('[Retention] Stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
