import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, users, authorizationCodes } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import {
  checkRateLimit,
  generateRateLimitKey,
  getClientIp,
  logSuccess,
  logFailure,
  extractRequestInfo,
  checkProjectAccess,
} from '@/lib/security';

/**
 * Public Token Exchange Endpoint (dla prostych aplikacji frontendowych)
 *
 * Wymienia jednorazowy kod autoryzacyjny na dane użytkownika BEZ API Key.
 * Używany przez SDK dla statycznych stron (bez backendu).
 *
 * OGRANICZENIA BEZPIECZEŃSTWA:
 * - Weryfikacja redirect_uri (musi pasować do zapisanego w kodzie)
 * - Rate limiting (bardziej restrykcyjne)
 * - Nie zwraca tokenVersion (dla bezpieczeństwa Kill Switch)
 *
 * POST /api/v1/public/token
 * Body: { "code": "authorization_code", "redirect_uri": "original_redirect_uri" }
 *
 * Response (sukces):
 *   { "user": { id, email, name, image } }
 */
export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);

  try {
    // 0. Rate Limiting - bardziej restrykcyjne dla publicznego endpointu
    const rateLimitKey = generateRateLimitKey(getClientIp(req), 'api/v1/public/token');
    const rateLimitResult = await checkRateLimit(rateLimitKey, {
      windowMs: 60 * 1000, // 1 minuta
      maxRequests: 10, // Tylko 10 prób na minutę
    });

    if (!rateLimitResult.allowed) {
      await logFailure('rate_limited', {
        ipAddress,
        userAgent,
        metadata: { endpoint: 'api/v1/public/token', retryAfterMs: rateLimitResult.retryAfterMs },
      });

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

    // 1. Pobranie kodu i redirect_uri z body
    const body = await req.json();
    const { code, redirect_uri } = body;

    if (!code || !redirect_uri) {
      await logFailure('token_exchange', {
        ipAddress,
        userAgent,
        metadata: { reason: 'missing_params', endpoint: 'public' },
      });
      return NextResponse.json(
        { error: 'Missing authorization code or redirect_uri' },
        { status: 400 }
      );
    }

    // 2. Wyszukanie kodu autoryzacyjnego w bazie
    const authCode = await db.query.authorizationCodes.findFirst({
      where: and(eq(authorizationCodes.code, code), isNull(authorizationCodes.usedAt)),
    });

    if (!authCode) {
      await logFailure('token_exchange', {
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_code', endpoint: 'public' },
      });
      return NextResponse.json(
        { error: 'Invalid or already used authorization code' },
        { status: 401 }
      );
    }

    // 3. WAŻNE: Weryfikacja redirect_uri (musi dokładnie pasować!)
    if (authCode.redirectUri !== redirect_uri) {
      await logFailure('token_exchange', {
        ipAddress,
        userAgent,
        metadata: { reason: 'redirect_uri_mismatch', endpoint: 'public' },
      });
      return NextResponse.json({ error: 'Redirect URI mismatch' }, { status: 400 });
    }

    // 4. Sprawdzenie czy kod nie wygasł
    if (authCode.expiresAt < new Date()) {
      await logFailure('token_exchange', {
        ipAddress,
        userAgent,
        metadata: { reason: 'code_expired', endpoint: 'public' },
      });
      return NextResponse.json({ error: 'Authorization code expired' }, { status: 401 });
    }

    // 5. Oznaczenie kodu jako użytego (jednorazowy!)
    await db
      .update(authorizationCodes)
      .set({ usedAt: new Date() })
      .where(eq(authorizationCodes.id, authCode.id));

    // 6. Pobranie danych użytkownika
    const user = await db.query.users.findFirst({
      where: eq(users.id, authCode.userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 7. Pobranie projektu (dla logowania)
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, authCode.projectId),
    });

    // 8. Sprawdzenie izolacji danych
    const accessResult = await checkProjectAccess(user.id, authCode.projectId);

    if (!accessResult.allowed) {
      await logFailure('access_denied', {
        userId: user.id,
        projectId: authCode.projectId,
        ipAddress,
        userAgent,
        metadata: { reason: accessResult.reason, endpoint: 'public' },
      });
      return NextResponse.json(
        { error: 'Access denied. User is not authorized for this project.' },
        { status: 403 }
      );
    }

    // 9. Logowanie sukcesu z informacją o stronie docelowej
    await logSuccess('token_exchange', {
      userId: user.id,
      projectId: authCode.projectId,
      ipAddress,
      userAgent,
      metadata: {
        endpoint: 'public',
        redirectUri: redirect_uri,
        projectName: project?.name || 'Nieznany',
        userEmail: user.email,
      },
    });

    // 10. Sukces - zwracamy podstawowe dane użytkownika (bez tokenVersion!)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      project: project
        ? {
            id: project.id,
            name: project.name,
          }
        : null,
    });
  } catch (error) {
    console.error('Public token exchange error:', error);
    await logFailure('token_exchange', {
      ipAddress,
      userAgent,
      metadata: { reason: 'internal_error', endpoint: 'public', error: String(error) },
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
