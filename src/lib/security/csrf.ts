/**
 * CSRF Protection - Ochrona przed Cross-Site Request Forgery
 * 
 * Implementuje weryfikację Origin/Referer headers oraz tokeny CSRF
 */

import { randomBytes, createHmac } from 'crypto';

/**
 * Generuje CSRF token (HMAC signed)
 */
export function generateCSRFToken(secret: string, sessionId: string): string {
  const token = randomBytes(32).toString('hex');
  const hmac = createHmac('sha256', secret);
  hmac.update(sessionId + token);
  return `${token}:${hmac.digest('hex')}`;
}

/**
 * Weryfikuje CSRF token
 */
export function verifyCSRFToken(
  token: string,
  secret: string,
  sessionId: string
): boolean {
  const [tokenPart, signature] = token.split(':');
  if (!tokenPart || !signature) {
    return false;
  }

  const hmac = createHmac('sha256', secret);
  hmac.update(sessionId + tokenPart);
  const expectedSignature = hmac.digest('hex');

  return expectedSignature === signature;
}

/**
 * Weryfikuje Origin/Referer headers dla ochrony CSRF
 * 
 * @param request - Next.js Request object
 * @param allowedOrigins - Lista dozwolonych originów
 * @returns true jeśli origin jest dozwolony
 */
export function verifyOrigin(
  request: Request,
  allowedOrigins: string[]
): boolean {
  // Pobierz origin lub referer
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Jeśli brak obu nagłówków, sprawdź czy to może być GET request (mniej krytyczne)
  if (!origin && !referer) {
    // Dla GET requestów (mniej ryzykowne), pozwól jeśli nie ma origin
    if (request.method === 'GET') {
      return true;
    }
    // Dla POST/PUT/DELETE - wymagaj origin
    return false;
  }

  // Wyciągnij origin z referer jeśli brak origin
  let sourceOrigin: string | null = null;
  if (origin) {
    sourceOrigin = origin;
  } else if (referer) {
    try {
      const refererUrl = new URL(referer);
      sourceOrigin = refererUrl.origin;
    } catch {
      return false; // Nieprawidłowy referer URL
    }
  }

  if (!sourceOrigin) {
    return false;
  }

  // Sprawdź czy origin jest w whitelist
  return allowedOrigins.includes(sourceOrigin);
}

/**
 * Pobiera listę dozwolonych originów z env
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (!envOrigins) {
    // Domyślnie: tylko własna domena
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    return nextAuthUrl ? [nextAuthUrl] : [];
  }

  return envOrigins.split(',').map((origin) => origin.trim());
}

/**
 * Middleware helper do weryfikacji CSRF
 * 
 * Użyj w każdym wrażliwym API endpoint:
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const allowedOrigins = getAllowedOrigins();
 *   if (!verifyOrigin(request, allowedOrigins)) {
 *     return NextResponse.json(
 *       { error: 'Invalid origin' },
 *       { status: 403 }
 *     );
 *   }
 *   // ... reszta kodu
 * }
 * ```
 */
export function requireValidOrigin(request: Request): boolean {
  const allowedOrigins = getAllowedOrigins();
  
  // W development, pozwól na localhost
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    );
  }

  return verifyOrigin(request, allowedOrigins);
}

