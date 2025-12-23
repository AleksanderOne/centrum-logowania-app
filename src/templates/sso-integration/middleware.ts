import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware - ochrona tras (Edge Runtime)
 * 
 * DOSTOSUJ:
 * - protectedPaths: trasy wymagające zalogowania
 * - publicAuthPaths: trasy tylko dla niezalogowanych
 * - domyślna strona po logowaniu
 */

function hasSSOSession(request: NextRequest): boolean {
    try {
        const ssoCookie = request.cookies.get('sso-session');
        if (!ssoCookie?.value) return false;

        const decodedValue = decodeURIComponent(ssoCookie.value);
        const session = JSON.parse(decodedValue);

        return session.expiresAt > Date.now();
    } catch {
        return false;
    }
}

export function middleware(request: NextRequest) {
    const isLoggedIn = hasSSOSession(request);
    const pathname = request.nextUrl.pathname;

    // DOSTOSUJ: Trasy wymagające zalogowania
    const protectedPaths = [
        '/dashboard',
        '/profile',
        '/settings',
        '/admin',
    ];

    // DOSTOSUJ: Trasy tylko dla niezalogowanych
    const publicAuthPaths = ['/login'];

    const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path));
    const isPublicAuthRoute = publicAuthPaths.some(path => pathname.startsWith(path));

    // Zalogowany na login -> redirect do dashboard
    if (isLoggedIn && isPublicAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.nextUrl)); // DOSTOSUJ
    }

    // Niezalogowany na chronioną trasę -> redirect do login
    if (!isLoggedIn && isProtectedRoute) {
        const loginUrl = new URL('/login', request.nextUrl);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // DOSTOSUJ: Dodaj swoje chronione trasy
        '/dashboard/:path*',
        '/profile/:path*',
        '/settings/:path*',
        '/admin/:path*',
        '/login',
    ],
};
