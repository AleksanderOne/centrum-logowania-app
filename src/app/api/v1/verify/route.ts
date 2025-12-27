import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decode } from 'next-auth/jwt';
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

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);

  try {
    // 0. Rate Limiting
    const rateLimitKey = generateRateLimitKey(getClientIp(req), 'api/v1/verify');
    const rateLimitResult = await checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.api);

    if (!rateLimitResult.allowed) {
      await logFailure('rate_limited', {
        ipAddress,
        userAgent,
        metadata: { endpoint: 'api/v1/verify', retryAfterMs: rateLimitResult.retryAfterMs },
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
      await logFailure('token_verify', {
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
      await logFailure('token_verify', {
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_api_key' },
      });
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
    }

    // 2. Pobranie tokenu z body
    const body = await req.json();
    const { token } = body;

    if (!token) {
      await logFailure('token_verify', {
        projectId: project.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'missing_token' },
      });
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // 3. Dekodowanie i weryfikacja tokenu (JWE)
    const secret = process.env.NEXTAUTH_SECRET!;

    // Próbujemy najpierw standardowy salt (dla HTTP/localhost)
    let decodedToken = await decode({
      token,
      secret,
      salt: 'authjs.session-token',
    });

    // Jeśli się nie udało, próbujemy salt produkcyjny (dla HTTPS/Vercel)
    if (!decodedToken) {
      decodedToken = await decode({
        token,
        secret,
        salt: '__Secure-authjs.session-token',
      });
    }

    if (!decodedToken) {
      await logFailure('token_verify', {
        projectId: project.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_token' },
      });
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 4. Sprawdzenie wygasnięcia (exp)
    if (decodedToken.exp && Date.now() / 1000 > decodedToken.exp) {
      await logFailure('token_verify', {
        projectId: project.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'token_expired' },
      });
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }

    // 5. Sprawdzenie wersji tokenu (Kill Switch)
    if (decodedToken.sub) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, decodedToken.sub),
      });

      const tokenVersion = (decodedToken as { tokenVersion?: number }).tokenVersion;

      if (!user || (user.tokenVersion && user.tokenVersion !== (tokenVersion || 1))) {
        await logFailure('token_verify', {
          userId: decodedToken.sub,
          projectId: project.id,
          ipAddress,
          userAgent,
          metadata: { reason: 'token_revoked' },
        });
        return NextResponse.json({ error: 'Token revoked' }, { status: 401 });
      }

      // 5.1. Sprawdzenie izolacji danych - czy użytkownik ma dostęp do projektu
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

      // 6. Logowanie sukcesu
      await logSuccess('token_verify', {
        userId: user.id,
        projectId: project.id,
        ipAddress,
        userAgent,
      });

      // 7. Sukces - zwracamy dane użytkownika
      return NextResponse.json(
        {
          valid: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
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
    }

    await logFailure('token_verify', {
      projectId: project.id,
      ipAddress,
      userAgent,
      metadata: { reason: 'invalid_token_structure' },
    });
    return NextResponse.json({ error: 'Invalid token structure' }, { status: 400 });
  } catch (error) {
    console.error('Token verification error:', error);
    await logFailure('token_verify', {
      ipAddress,
      userAgent,
      metadata: { reason: 'internal_error', error: String(error) },
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
