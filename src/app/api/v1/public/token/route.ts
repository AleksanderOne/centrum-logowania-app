import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, users, authorizationCodes, projectSessions } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import {
  checkRateLimit,
  generateRateLimitKey,
  getClientIp,
  logSuccess,
  logFailure,
  extractRequestInfo,
  checkProjectAccess,
  verifyPKCE,
} from '@/lib/security';
import { devLog } from '@/lib/utils';
import { signSessionToken } from '@/lib/jwt';
import { serverLog } from '@/lib/debug-logger';

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
    const { code, redirect_uri, code_verifier } = body;

    devLog(`\n[TOKEN] 📥 POST /api/v1/public/token - Wymiana kodu autoryzacyjnego`);
    devLog(`[TOKEN] 🔍 Code: ${code?.substring(0, 6)}... Redirect: ${redirect_uri}`);
    serverLog('[TOKEN] Exchange Request start', {
      code: code?.substring(0, 10) + '...',
      redirect_uri,
    });

    if (!code || !redirect_uri) {
      await logFailure('token_exchange', {
        ipAddress,
        userAgent,
        metadata: { reason: 'missing_params', endpoint: 'public' },
      });
      serverLog('[TOKEN] Missing parameters', { code, redirect_uri });
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
      devLog('[TOKEN] Nieprawidłowy kod autoryzacyjny');
      serverLog('[TOKEN] Invalid or expired code', { code });
      await logFailure('token_exchange', {
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_code', endpoint: 'public' },
      });
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid authorization code' },
        { status: 400 }
      );
    }

    // 3. WAŻNE: Weryfikacja redirect_uri (musi dokładnie pasować!)
    if (authCode.redirectUri !== redirect_uri) {
      devLog(
        `[TOKEN] ❌ Niezgodny Redirect URI: Oczekiwano ${authCode.redirectUri}, otrzymano ${redirect_uri}`
      );
      serverLog('[TOKEN] Redirect URI mismatch', {
        expected: authCode.redirectUri,
        received: redirect_uri,
      });
      await logFailure('token_exchange', {
        ipAddress,
        userAgent,
        metadata: { reason: 'redirect_uri_mismatch', endpoint: 'public' },
      });
      return NextResponse.json({ error: 'Redirect URI mismatch' }, { status: 400 });
    }

    // 3.5. Weryfikacja PKCE (jeśli zapisano w kodzie)
    if (authCode.codeChallenge) {
      if (!code_verifier) {
        await logFailure('token_exchange', {
          ipAddress,
          userAgent,
          metadata: { reason: 'missing_code_verifier', endpoint: 'public' },
        });
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'code_verifier is required' },
          { status: 400 }
        );
      }

      const isPkceValid = verifyPKCE(code_verifier, authCode.codeChallenge);
      if (!isPkceValid) {
        await logFailure('token_exchange', {
          ipAddress,
          userAgent,
          metadata: { reason: 'pkce_verification_failed', endpoint: 'public' },
        });
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid code_verifier' },
          { status: 400 }
        );
      }
    }

    // 4. Sprawdzenie czy kod nie wygasł
    if (authCode.expiresAt < new Date()) {
      serverLog('[TOKEN] Authorization code expired', { code });
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
      serverLog('[TOKEN] User not found for authCode', { userId: authCode.userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 7. Pobranie projektu (dla logowania)
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, authCode.projectId),
    });

    // 8. Sprawdzenie izolacji danych
    const accessResult = await checkProjectAccess(user.id, authCode.projectId);

    if (!accessResult.allowed) {
      devLog(`[TOKEN] ⛔ Odmowa dostępu do projektu: ${accessResult.reason}`);
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

    // 8.5. Zapis sesji w projekcie (dla monitoringu)
    // Aktualizuj istniejącą sesję lub utwórz nową
    const existingSession = await db.query.projectSessions.findFirst({
      where: and(
        eq(projectSessions.userId, user.id),
        eq(projectSessions.projectId, authCode.projectId)
      ),
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
        projectId: authCode.projectId,
        userEmail: user.email,
        userName: user.name,
        userAgent,
        ipAddress,
      });
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

    // 10. Generowanie Session Token (dla weryfikacji dostępu w SDK)
    const sessionToken = await signSessionToken({
      userId: user.id,
      projectId: authCode.projectId,
      tokenVersion: user.tokenVersion || 0,
    });

    devLog(`[TOKEN] ✅ Wymiana sukces! Zalogowano: ${user.email} (Projekt: ${project?.name})`);
    serverLog(`[TOKEN] Success`, { user: user.email, project: project?.name });

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
      sessionToken,
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
