import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, users, authorizationCodes, projectSessions } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 7.5. Zapis sesji w projekcie (dla monitoringu)
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const forwarded = req.headers.get('x-forwarded-for');
    const ipAddress = forwarded
      ? forwarded.split(',')[0]
      : req.headers.get('x-real-ip') || 'Unknown';

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

    // 8. Sukces - zwracamy dane użytkownika wraz z tokenVersion (dla Kill Switch)
    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
