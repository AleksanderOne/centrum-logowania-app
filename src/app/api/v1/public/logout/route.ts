import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, projectSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  checkRateLimit,
  generateRateLimitKey,
  getClientIp,
  logSuccess,
  logFailure,
  extractRequestInfo,
} from '@/lib/security';

/**
 * Public Logout Endpoint (dla aplikacji frontendowych korzystających z SDK)
 *
 * Usuwa sesję użytkownika z projektu.
 * Wywoływany przez SDK przy wylogowaniu.
 *
 * POST /api/v1/public/logout
 * Body: { "userId": "user_uuid", "projectSlug": "project_slug" }
 *
 * Response (sukces):
 *   { "success": true }
 */
export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);

  try {
    // Rate limiting
    const rateLimitKey = generateRateLimitKey(getClientIp(req), 'api/v1/public/logout');
    const rateLimitResult = await checkRateLimit(rateLimitKey, {
      windowMs: 60 * 1000, // 1 minuta
      maxRequests: 20, // 20 prób na minutę
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.retryAfterMs || 60000) / 1000)),
          },
        }
      );
    }

    // Pobranie danych z body (obsługa pustego/nieprawidłowego body)
    let body;
    try {
      body = await req.json();
    } catch {
      // Puste lub nieprawidłowe body - zwróć sukces (graceful degradation)
      return NextResponse.json({ success: true });
    }

    const { userId, projectSlug } = body || {};

    if (!userId || !projectSlug) {
      // Brak wymaganych parametrów - zwróć sukces (graceful degradation)
      return NextResponse.json({ success: true });
    }

    // Znajdź projekt po slug
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, projectSlug),
    });

    if (!project) {
      // Nie ujawniaj czy projekt istnieje
      return NextResponse.json({ success: true });
    }

    // Usuń sesję użytkownika z projektu
    await db
      .delete(projectSessions)
      .where(and(eq(projectSessions.userId, userId), eq(projectSessions.projectId, project.id)));

    // Loguj sukces
    await logSuccess('logout', {
      userId,
      projectId: project.id,
      ipAddress,
      userAgent,
      metadata: { endpoint: 'public' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Public logout error:', error);
    await logFailure('logout', {
      ipAddress,
      userAgent,
      metadata: { reason: 'internal_error', endpoint: 'public', error: String(error) },
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
