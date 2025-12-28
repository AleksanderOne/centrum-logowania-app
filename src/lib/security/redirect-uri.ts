/**
 * Redirect URI Validation - Weryfikacja bezpieczeństwa redirect URI
 *
 * Zapewnia, że redirect_uri jest bezpieczny i pasuje do skonfigurowanej domeny projektu
 */

/**
 * Waliduje redirect URI zgodnie z najlepszymi praktykami OAuth 2.0
 *
 * @param redirectUri - URI do przekierowania
 * @param allowedDomain - Dozwolona domena z konfiguracji projektu (opcjonalnie)
 * @returns true jeśli URI jest bezpieczny i dozwolony
 */
export function validateRedirectUri(
  redirectUri: string,
  allowedDomain: string | null
): { valid: boolean; reason?: string } {
  // Podstawowa walidacja
  if (!redirectUri || typeof redirectUri !== 'string') {
    return { valid: false, reason: 'Redirect URI is required' };
  }

  // Sprawdź długość (zapobiega atakom)
  if (redirectUri.length > 2048) {
    return { valid: false, reason: 'Redirect URI too long' };
  }

  try {
    const url = new URL(redirectUri);

    // 1. Sprawdź protokół
    // W produkcji tylko HTTPS (z wyjątkiem localhost w dev)
    if (process.env.NODE_ENV === 'production') {
      if (url.protocol !== 'https:') {
        // Localhost jest OK tylko w development
        if (
          url.hostname !== 'localhost' &&
          url.hostname !== '127.0.0.1' &&
          !url.hostname.startsWith('127.0.0.1:')
        ) {
          return {
            valid: false,
            reason: 'Only HTTPS redirect URIs are allowed in production',
          };
        }
      }
    }

    // 2. Sprawdź hostname (zapobiega atakom typu "example.com.evil.com")
    const hostname = url.hostname.toLowerCase();

    // Zablokuj niebezpieczne hostname
    if (
      hostname.includes('..') || // Path traversal
      hostname.includes('\0') || // Null bytes
      hostname.includes('%00') || // URL encoded null
      hostname.includes('//') // Double slash
    ) {
      return { valid: false, reason: 'Invalid hostname format' };
    }

    // 3. Jeśli podano allowedDomain, zweryfikuj dokładnie
    if (allowedDomain) {
      try {
        const allowedUrl = new URL(allowedDomain);

        // DOKŁADNE dopasowanie hostname (nie tylko startsWith!)
        if (hostname !== allowedUrl.hostname.toLowerCase()) {
          return {
            valid: false,
            reason: `Redirect URI hostname does not match allowed domain. Expected: ${allowedUrl.hostname}, got: ${hostname}`,
          };
        }

        // Opcjonalnie: sprawdź czy ścieżka zaczyna się od dozwolonych
        // Możesz dodać whitelist ścieżek dla dodatkowej ochrony
        // const allowedPaths = ['/callback', '/auth/callback', '/oauth/callback'];
        // const pathMatches = allowedPaths.some(path => url.pathname.startsWith(path));
        // if (!pathMatches) {
        //   return { valid: false, reason: 'Redirect URI path not allowed' };
        // }
      } catch {
        // allowedDomain może być domeną bez protokołu - spróbuj dodać https://
        try {
          const allowedUrl = new URL(`https://${allowedDomain}`);
          if (hostname !== allowedUrl.hostname.toLowerCase()) {
            return {
              valid: false,
              reason: `Redirect URI hostname does not match allowed domain`,
            };
          }
        } catch {
          // Jeśli nie można sparsować domeny, zwróć błąd
          return {
            valid: false,
            reason: 'Invalid allowed domain configuration',
          };
        }
      }
    }

    // 4. Sprawdź czy port jest dozwolony (tylko standardowe porty w produkcji)
    if (process.env.NODE_ENV === 'production') {
      const port = url.port;
      if (port && port !== '443' && port !== '80') {
        // Pozwól na niestandardowe porty tylko dla localhost w dev
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          return {
            valid: false,
            reason: 'Non-standard ports are not allowed in production',
          };
        }
      }
    }

    // 5. Sprawdź fragment (#) - OAuth 2.0 nie powinien używać fragmentów w redirect_uri
    if (url.hash && url.hash.length > 0) {
      return {
        valid: false,
        reason: 'Redirect URI must not contain fragment (#)',
      };
    }

    // 6. Zapobiegaj "open redirector" - sprawdź podejrzane parametry
    // Niektóre ataki próbują użyć parametrów jak ?redirect=evil.com
    const suspiciousParams = ['redirect', 'redirect_to', 'url', 'next', 'return'];
    for (const param of suspiciousParams) {
      if (url.searchParams.has(param)) {
        const paramValue = url.searchParams.get(param);
        if (paramValue && (paramValue.startsWith('http://') || paramValue.startsWith('https://'))) {
          return {
            valid: false,
            reason: 'Redirect URI contains suspicious redirect parameter',
          };
        }
      }
    }

    return { valid: true };
  } catch {
    // Nieprawidłowy format URL
    return {
      valid: false,
      reason: 'Invalid URL format',
    };
  }
}

/**
 * Helper do sprawdzenia czy redirect URI jest dozwolony dla projektu
 *
 * @param redirectUri - URI do przekierowania
 * @param projectDomain - Domena skonfigurowana w projekcie
 * @returns true jeśli dozwolony
 */
export function isRedirectUriAllowed(redirectUri: string, projectDomain: string | null): boolean {
  const result = validateRedirectUri(redirectUri, projectDomain);
  return result.valid;
}
