import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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
 * Session Verification Endpoint
 *
 * Weryfikuje czy sesja użytkownika jest nadal ważna (sprawdza tokenVersion).
 * Używane przez aplikacje klienckie do weryfikacji "Kill Switch".
 *
 * POST /api/v1/session/verify
 * Headers:
 *   x-api-key: API_KEY projektu
 * Body:
 *   { "userId": "user_uuid", "tokenVersion": 1 }
 *
 * Response (sesja ważna):
 *   { "valid": true }
 *
 * Response (sesja nieważna - użytkownik wylogowany/zablokowany):
 *   { "valid": false, "reason": "token_version_mismatch" | "user_not_found" }
 */
export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);

  try {
    // 0. Rate Limiting - liberalne dla weryfikacji sesji (często wywoływane)
    const rateLimitKey = generateRateLimitKey(getClientIp(req), 'api/v1/session/verify');
    const rateLimitResult = await checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.sessionVerify);

    if (!rateLimitResult.allowed) {
      await logFailure('rate_limited', {
        ipAddress,
        userAgent,
        metadata: { endpoint: 'api/v1/session/verify', retryAfterMs: rateLimitResult.retryAfterMs },
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
      await logFailure('session_verify', {
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
      await logFailure('session_verify', {
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_api_key' },
      });
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
    }

    // 2. Pobranie danych z body
    const body = await req.json();
    const { userId, tokenVersion } = body;

    if (!userId) {
      await logFailure('session_verify', {
        projectId: project.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'missing_user_id' },
      });
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // 3. Pobranie użytkownika z bazy
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      await logFailure('session_verify', {
        userId,
        projectId: project.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'user_not_found' },
      });
      return NextResponse.json({
        valid: false,
        reason: 'user_not_found',
      });
    }

    // 3.1. Sprawdzenie izolacji danych - czy użytkownik ma dostęp do projektu
    const accessResult = await checkProjectAccess(user.id, project.id);

    if (!accessResult.allowed) {
      await logFailure('access_denied', {
        userId: user.id,
        projectId: project.id,
        ipAddress,
        userAgent,
        metadata: { reason: accessResult.reason },
      });
      return NextResponse.json({
        valid: false,
        reason: 'access_denied',
      });
    }

    // 4. Sprawdzenie tokenVersion (Kill Switch)
    const currentVersion = user.tokenVersion || 1;
    const providedVersion = tokenVersion || 1;

    if (currentVersion !== providedVersion) {
      await logFailure('session_verify', {
        userId: user.id,
        projectId: project.id,
        ipAddress,
        userAgent,
        metadata: {
          reason: 'token_version_mismatch',
          current: currentVersion,
          provided: providedVersion,
        },
      });
      return NextResponse.json({
        valid: false,
        reason: 'token_version_mismatch',
      });
    }

    // 5. Logowanie sukcesu
    await logSuccess('session_verify', {
      userId: user.id,
      projectId: project.id,
      ipAddress,
      userAgent,
    });

    // 6. Sesja ważna
    return NextResponse.json(
      {
        valid: true,
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
        },
      }
    );
  } catch (error) {
    console.error('Session verification error:', error);
    await logFailure('session_verify', {
      ipAddress,
      userAgent,
      metadata: { reason: 'internal_error', error: String(error) },
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
