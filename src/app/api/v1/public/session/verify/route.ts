import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, projectSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkProjectAccess } from '@/lib/security';

import { serverLog } from '@/lib/debug-logger';
import { verifySessionToken } from '@/lib/jwt';

/**
 * Public Session Verify Endpoint (dla Demo App SDK)
 *
 * Pozwala statycznym aplikacjom sprawdzić, czy obecna sesja jest ważna
 * w świetle aktualnych ustawień (np. czy projekt nie stał się prywatny).
 *
 * POST /api/v1/public/session/verify
 * Body: { "token": "JWT..." }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      serverLog('[VERIFY] Missing token');
      return NextResponse.json({ valid: false, reason: 'missing_token' }, { status: 400 });
    }

    // 1. Weryfikacja podpisu JWT
    const payload = await verifySessionToken(token);

    if (!payload || !payload.userId || !payload.projectId) {
      serverLog('[VERIFY] Invalid JWT signature or payload', {
        tokenExcerpt: token.substring(0, 10),
      });
      return NextResponse.json({ valid: false, reason: 'invalid_token' });
    }

    serverLog('[VERIFY] Token valid, checking DB access', {
      userId: payload.userId,
      projectId: payload.projectId,
    });

    // 2. Sprawdzenie dostępu do projektu (Real-time check)
    const accessResult = await checkProjectAccess(
      payload.userId as string,
      payload.projectId as string
    );
    if (!accessResult.allowed) {
      serverLog(`[VERIFY] Access denied: User ${payload.userId} to Project ${payload.projectId}`);
      return NextResponse.json({ valid: false, reason: 'access_denied' });
    }

    // 3. Sprawdzenie Token Version (Kill Switch)
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId as string),
      columns: { tokenVersion: true },
    });

    if (!user) {
      return NextResponse.json({ valid: false, reason: 'user_not_found' });
    }

    const currentVersion = user.tokenVersion || 0;
    const tokenVersion = (payload.tokenVersion as number) || 0;

    if (currentVersion !== tokenVersion) {
      serverLog('[VERIFY] Token version mismatch (Kill Switch)', {
        current: currentVersion,
        token: tokenVersion,
      });
      return NextResponse.json({ valid: false, reason: 'token_version_mismatch' });
    }

    // 4. Idle Session Timeout check (np. 30 minut)
    const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
    const now = new Date();

    const session = await db.query.projectSessions.findFirst({
      where: and(
        eq(projectSessions.userId, payload.userId as string),
        eq(projectSessions.projectId, payload.projectId as string)
      ),
    });

    if (session?.lastSeenAt) {
      const isIdle = now.getTime() - session.lastSeenAt.getTime() > IDLE_TIMEOUT_MS;
      if (isIdle) {
        serverLog('[VERIFY] Session expired due to idle timeout', {
          lastSeen: session.lastSeenAt,
          now,
        });
        return NextResponse.json({ valid: false, reason: 'idle_timeout' });
      }

      // Aktualizujemy czas ostatniej aktywności
      // Optymalizacja: aktualizujemy tylko jeśli minęło np. 1 minuta od ostatniej aktualizacji
      if (now.getTime() - session.lastSeenAt.getTime() > 60 * 1000) {
        await db
          .update(projectSessions)
          .set({ lastSeenAt: now })
          .where(eq(projectSessions.id, session.id));
      }
    }

    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error('[VERIFY] Error:', err);
    return NextResponse.json({ valid: false, error: 'internal_error' }, { status: 500 });
  }
}
