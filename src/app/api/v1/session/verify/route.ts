import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
  try {
    // 1. Walidacja API Key
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.apiKey, apiKey),
    });

    if (!project) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
    }

    // 2. Pobranie danych z body
    const body = await req.json();
    const { userId, tokenVersion } = body;

    if (!userId) {
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
      return NextResponse.json({
        valid: false,
        reason: 'user_not_found',
      });
    }

    // 4. Sprawdzenie tokenVersion (Kill Switch)
    const currentVersion = user.tokenVersion || 1;
    const providedVersion = tokenVersion || 1;

    if (currentVersion !== providedVersion) {
      return NextResponse.json({
        valid: false,
        reason: 'token_version_mismatch',
      });
    }

    // 5. Sesja ważna
    return NextResponse.json({
      valid: true,
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
