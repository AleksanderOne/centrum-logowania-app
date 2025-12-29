import { NextRequest, NextResponse } from 'next/server';
import { generateSecurityReport, getSecurityMetrics, detectSecurityThreats } from '@/lib/security';

/**
 * Admin API: Security Monitoring
 *
 * Zwraca metryki bezpieczeństwa i aktywne alerty.
 * Chroniony przez ADMIN_API_KEY.
 *
 * GET /api/v1/admin/security
 * Headers: x-admin-key: ADMIN_API_KEY
 *
 * GET /api/v1/admin/security?type=metrics - tylko metryki
 * GET /api/v1/admin/security?type=alerts - tylko alerty
 * GET /api/v1/admin/security?type=report - pełny raport (domyślnie)
 */

function isAuthorized(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return false;
  }

  const providedKey = req.headers.get('x-admin-key');
  return providedKey === adminKey;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'report';

    switch (type) {
      case 'metrics': {
        const metrics = await getSecurityMetrics();
        return NextResponse.json({ success: true, metrics });
      }
      case 'alerts': {
        const alerts = await detectSecurityThreats();
        return NextResponse.json({
          success: true,
          alerts,
          hasActiveAlerts: alerts.length > 0,
          criticalCount: alerts.filter((a) => a.level === 'critical').length,
          warningCount: alerts.filter((a) => a.level === 'warning').length,
        });
      }
      case 'report':
      default: {
        const report = await generateSecurityReport();
        return NextResponse.json({
          success: true,
          ...report,
        });
      }
    }
  } catch (error) {
    console.error('[Security Monitoring] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
