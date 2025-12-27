import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, users, authorizationCodes, projectSessions } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import {
  checkRateLimit,
  generateRateLimitKey,
  getClientIp,
  RATE_LIMIT_CONFIGS,
  logSuccess,
  logFailure,
  extractRequestInfo,
  checkProjectAccess,
} from '@/lib/security';

/**
 * OAuth2 Token Exchange Endpoint
 *
 * Wymienia jednorazowy kod autoryzacyjny na dane użytkownika.
 *
 * POST /api/v1/token
 * Headers:
 *   x-api-key: API_KEY projektu
 * Body:
 *   { "code": "authorization_code", "redirect_uri": "original_redirect_uri" }
 *
 * Response (sukces):
 *   { "user": { id, email, name, image, role }, "project": { id, name } }
 *
 * Response (błąd):
 *   { "error": "message" }
 */
export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);

  try {
    // 0. Rate Limiting
    const rateLimitKey = generateRateLimitKey(getClientIp(req), 'api/v1/token');
    const rateLimitResult = await checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.tokenExchange);

    if (!rateLimitResult.allowed) {
      await logFailure('rate_limited', {
        ipAddress,
        userAgent,
        metadata: { endpoint: 'api/v1/token', retryAfterMs: rateLimitResult.retryAfterMs },
      });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.retryAfterMs || 60000) / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
          },
        }
      );
    }

    // 1. Walidacja API Key
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey) {
      await logFailure('token_exchange', {
        ipAddress,
        userAgent,
        metadata: { reason: 'missing_api_key' },
      });
      return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.apiKey, apiKey),
    });

    if (!project) {
      await logFailure('token_exchange', {
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_api_key' },
      });
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
    }

    // 2. Pobranie kodu i redirect_uri z body
    const body = await req.json();
    const { code, redirect_uri } = body;

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    // 3. Wyszukanie kodu autoryzacyjnego w bazie
    const authCode = await db.query.authorizationCodes.findFirst({
      where: and(
        eq(authorizationCodes.code, code),
        eq(authorizationCodes.projectId, project.id),
        isNull(authorizationCodes.usedAt) // Nie został jeszcze użyty
      ),
    });

    if (!authCode) {
      return NextResponse.json(
        { error: 'Invalid or already used authorization code' },
        { status: 401 }
      );
    }

    // 4. Sprawdzenie czy kod nie wygasł
    if (authCode.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Authorization code expired' }, { status: 401 });
    }

    // 5. Weryfikacja redirect_uri (opcjonalna ale zalecana)
    if (redirect_uri && authCode.redirectUri !== redirect_uri) {
      return NextResponse.json({ error: 'Redirect URI mismatch' }, { status: 400 });
    }

    // 6. Oznaczenie kodu jako użytego (jednorazowy!)
    await db
      .update(authorizationCodes)
      .set({ usedAt: new Date() })
      .where(eq(authorizationCodes.id, authCode.id));

    // 7. Pobranie danych użytkownika
    const user = await db.query.users.findFirst({
      where: eq(users.id, authCode.userId),
    });

    if (!user) {
      await logFailure('token_exchange', {
        projectId: project.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'user_not_found', userId: authCode.userId },
      });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 7.1. Sprawdzenie izolacji danych - czy użytkownik ma dostęp do projektu
    const accessResult = await checkProjectAccess(user.id, project.id);

    if (!accessResult.allowed) {
      await logFailure('access_denied', {
        userId: user.id,
        projectId: project.id,
        ipAddress,
        userAgent,
        metadata: { reason: accessResult.reason },
      });
      return NextResponse.json(
        { error: 'Access denied. User is not authorized for this project.' },
        { status: 403 }
      );
    }

    // 7.5. Zapis sesji w projekcie (dla monitoringu)
    // Aktualizuj istniejącą sesję lub utwórz nową
    const existingSession = await db.query.projectSessions.findFirst({
      where: and(eq(projectSessions.userId, user.id), eq(projectSessions.projectId, project.id)),
    });

    if (existingSession) {
      await db
        .update(projectSessions)
        .set({
          lastSeenAt: new Date(),
          userAgent,
          ipAddress,
          userName: user.name,
        })
        .where(eq(projectSessions.id, existingSession.id));
    } else {
      await db.insert(projectSessions).values({
        userId: user.id,
        projectId: project.id,
        userEmail: user.email,
        userName: user.name,
        userAgent,
        ipAddress,
      });
    }

    // 8. Logowanie sukcesu z informacją o stronie docelowej
    await logSuccess('token_exchange', {
      userId: user.id,
      projectId: project.id,
      ipAddress,
      userAgent,
      metadata: {
        redirectUri: authCode.redirectUri,
        projectName: project.name,
        userEmail: user.email,
      },
    });

    // 9. Sukces - zwracamy dane użytkownika wraz z tokenVersion (dla Kill Switch)
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          tokenVersion: user.tokenVersion || 1, // Wersja tokenu dla Kill Switch
        },
        project: {
          id: project.id,
          name: project.name,
        },
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
        },
      }
    );
  } catch (error) {
    console.error('Token exchange error:', error);
    await logFailure('token_exchange', {
      ipAddress,
      userAgent,
      metadata: { reason: 'internal_error', error: String(error) },
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
