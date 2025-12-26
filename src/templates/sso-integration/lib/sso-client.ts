/**
 * SSO Client - integracja z Centrum Logowania
 *
 * KONFIGURACJA:
 * Ustaw zmienne środowiskowe w .env.local:
 * - SSO_CENTER_URL (np. https://centrum-logowania-app-y7gt.vercel.app)
 * - SSO_CLIENT_ID (slug projektu z dashboardu centrum)
 * - SSO_API_KEY (klucz API z dashboardu centrum)
 * - NEXT_PUBLIC_SSO_CENTER_URL (dla client-side)
 * - NEXT_PUBLIC_SSO_CLIENT_ID (dla client-side)
 */

import { cookies } from 'next/headers';

// ============================================================================
// KONFIGURACJA
// ============================================================================

export const SSO_CONFIG = {
  centerUrl: process.env.SSO_CENTER_URL || process.env.NEXT_PUBLIC_SSO_CENTER_URL || '',
  clientId: process.env.SSO_CLIENT_ID || process.env.NEXT_PUBLIC_SSO_CLIENT_ID || '',
  apiKey: process.env.SSO_API_KEY || '',
  sessionMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 dni
  verifyInterval: 5 * 60 * 1000, // 5 minut
};

// ============================================================================
// TYPY
// ============================================================================

export interface SSOSession {
  userId: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  expiresAt: number;
  tokenVersion?: number;
  lastVerified?: number;
}

export interface SSOTokenResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: 'user' | 'admin';
    tokenVersion?: number;
  };
  project: {
    id: string;
    name: string;
  };
}

// ============================================================================
// FUNKCJE SESJI
// ============================================================================

/**
 * Pobiera sesję SSO z ciasteczka
 */
export async function getSSOSession(): Promise<SSOSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('sso-session');

    if (!sessionCookie?.value) {
      return null;
    }

    const session: SSOSession = JSON.parse(sessionCookie.value);

    if (session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Usuwa sesję SSO
 */
export async function clearSSOSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('sso-session');
}

// ============================================================================
// FUNKCJE API
// ============================================================================

/**
 * Wymienia kod autoryzacyjny na dane użytkownika
 */
export async function exchangeCodeForUser(
  code: string,
  redirectUri: string
): Promise<SSOTokenResponse | null> {
  const { centerUrl, apiKey } = SSO_CONFIG;

  try {
    const response = await fetch(`${centerUrl}/api/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });

    if (!response.ok) {
      console.error('SSO code exchange failed:', await response.json());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('SSO code exchange error:', error);
    return null;
  }
}

/**
 * Weryfikuje sesję z centrum (Kill Switch)
 */
export async function verifySessionWithCenter(
  userId: string,
  tokenVersion: number
): Promise<boolean> {
  const { centerUrl, apiKey } = SSO_CONFIG;

  try {
    const response = await fetch(`${centerUrl}/api/v1/session/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ userId, tokenVersion }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.valid === true;
  } catch {
    // Fail-open: błąd sieci = sesja ważna
    return true;
  }
}

// ============================================================================
// HELPERY
// ============================================================================

export function getCallbackUrl(baseUrl: string): string {
  return `${baseUrl}/api/auth/sso-callback`;
}
