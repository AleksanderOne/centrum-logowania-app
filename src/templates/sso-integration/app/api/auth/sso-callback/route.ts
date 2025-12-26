import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForUser, getCallbackUrl } from '@/lib/sso-client';

/**
 * SSO Callback - odbiera kod autoryzacyjny z centrum i tworzy lokalną sesję
 *
 * DOSTOSUJ: Jeśli używasz bazy danych, odkomentuj sekcję tworzenia użytkownika
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const baseUrl = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', baseUrl));
  }

  const redirectUri = getCallbackUrl(baseUrl);
  const tokenResult = await exchangeCodeForUser(code, redirectUri);

  if (!tokenResult) {
    return NextResponse.redirect(new URL('/login?error=invalid_code', baseUrl));
  }

  const { user: ssoUser } = tokenResult;

  try {
    // ================================================================
    // OPCJONALNIE: Tworzenie/aktualizacja użytkownika w lokalnej bazie
    // ================================================================
    // import { db } from '@/lib/db/drizzle';
    // import { users } from '@/lib/db/schema';
    // import { eq } from 'drizzle-orm';
    //
    // let localUser = await db.query.users.findFirst({
    //     where: eq(users.email, ssoUser.email),
    // });
    //
    // if (!localUser) {
    //     const [newUser] = await db.insert(users).values({
    //         id: crypto.randomUUID(),
    //         email: ssoUser.email,
    //         name: ssoUser.name,
    //         image: ssoUser.image,
    //         role: 'user',
    //     }).returning();
    //     localUser = newUser;
    // } else {
    //     await db.update(users)
    //         .set({ name: ssoUser.name, image: ssoUser.image })
    //         .where(eq(users.id, localUser.id));
    // }
    //
    // if (localUser.isBlocked) {
    //     return NextResponse.redirect(new URL('/login?error=blocked', baseUrl));
    // }
    // ================================================================

    // Ustawienie ciasteczka sesji SSO
    const cookieStore = await cookies();
    const sessionData = {
      userId: ssoUser.id, // lub localUser.id jeśli używasz bazy
      email: ssoUser.email,
      name: ssoUser.name,
      role: ssoUser.role,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 dni
      tokenVersion: ssoUser.tokenVersion || 1,
      lastVerified: Date.now(),
    };

    cookieStore.set('sso-session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    // Odczyt strony docelowej
    const returnUrlCookie = request.cookies.get('sso-return-url');
    let returnUrl = '/dashboard'; // ZMIEŃ na swoją domyślną stronę

    if (returnUrlCookie?.value) {
      returnUrl = decodeURIComponent(returnUrlCookie.value);
      cookieStore.delete('sso-return-url');
    }

    return NextResponse.redirect(new URL(returnUrl, baseUrl));
  } catch (error) {
    console.error('SSO callback error:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', baseUrl));
  }
}
