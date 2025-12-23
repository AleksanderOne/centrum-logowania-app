/**
 * Funkcja auth() - główny punkt wejścia do weryfikacji sesji
 * 
 * Użycie:
 * const session = await auth();
 * if (!session) redirect('/login');
 */

import { getSSOSession, clearSSOSession, verifySessionWithCenter, SSO_CONFIG } from '@/lib/sso-client';

// ============================================================================
// TYPY
// ============================================================================

export interface Session {
    user: {
        id: string;
        email: string;
        name?: string | null;
        image?: string | null;
        role: 'user' | 'admin';
    };
    expires: string;
}

// ============================================================================
// GŁÓWNA FUNKCJA
// ============================================================================

/**
 * Sprawdza sesję SSO i zwraca dane użytkownika
 * 
 * WAŻNE: Ta funkcja NIE odpytuje bazy danych!
 * Jeśli potrzebujesz danych z lokalnej bazy, pobierz je osobno:
 * 
 * const session = await auth();
 * const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
 */
export async function auth(): Promise<Session | null> {
    const ssoSession = await getSSOSession();

    if (!ssoSession) {
        return null;
    }

    // Weryfikacja Kill Switch (co 5 minut)
    const now = Date.now();
    const lastVerified = ssoSession.lastVerified || 0;
    const needsVerification = (now - lastVerified) > SSO_CONFIG.verifyInterval;

    if (needsVerification && ssoSession.tokenVersion) {
        const isValid = await verifySessionWithCenter(
            ssoSession.userId,
            ssoSession.tokenVersion
        );

        if (!isValid) {
            await clearSSOSession();
            return null;
        }
    }

    return {
        user: {
            id: ssoSession.userId,
            email: ssoSession.email,
            name: ssoSession.name,
            role: ssoSession.role,
        },
        expires: new Date(ssoSession.expiresAt).toISOString(),
    };
}

/**
 * Rozszerzona wersja auth() z danymi z lokalnej bazy
 *
 * DOSTOSUJ DO SWOJEJ APLIKACJI:
 * - Dodaj import db i schemat users
 * - Dodaj pola które potrzebujesz
 */
// export async function authWithDbUser(): Promise<{ session: Session; dbUser: User } | null> {
//     const session = await auth();
//     if (!session) return null;
//
//     const dbUser = await db.query.users.findFirst({
//         where: eq(users.id, session.user.id),
//     });
//
//     if (!dbUser || dbUser.isBlocked) return null;
//
//     return { session, dbUser };
// }
