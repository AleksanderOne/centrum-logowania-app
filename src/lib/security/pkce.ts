/**
 * PKCE (Proof Key for Code Exchange) - OAuth 2.0 Extension
 * 
 * Zwiększa bezpieczeństwo OAuth 2.0 flow dla publicznych klientów.
 * Zapobiega atakom code interception.
 * 
 * RFC 7636: https://tools.ietf.org/html/rfc7636
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Para PKCE: code_verifier i code_challenge
 */
export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * Generuje parę PKCE (code_verifier + code_challenge)
 * 
 * code_verifier: losowy string 43-128 znaków (RFC 7636)
 * code_challenge: SHA256 hash code_verifier, zakodowany base64url
 * 
 * @returns Para PKCE do użycia w OAuth flow
 */
export function generatePKCEPair(): PKCEPair {
  // Generuj code_verifier (43-128 znaków, zgodnie z RFC 7636)
  // Używamy 64 znaki dla dobrego balansu bezpieczeństwa i długości
  const codeVerifier = base64URLEncode(randomBytes(48)); // 48 bytes = 64 base64url chars

  // Oblicz code_challenge: SHA256(code_verifier) zakodowany base64url
  const codeChallenge = base64URLEncode(
    createHash('sha256').update(codeVerifier).digest()
  );

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256', // Tylko S256 jest zalecany (nie 'plain')
  };
}

/**
 * Weryfikuje code_verifier względem code_challenge
 * 
 * @param codeVerifier - code_verifier otrzymany w token exchange
 * @param codeChallenge - code_challenge zapisany przy generacji kodu
 * @returns true jeśli weryfikacja się powiodła
 */
export function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string
): boolean {
  // Walidacja formatu code_verifier
  if (!codeVerifier || codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }

  // Sprawdź czy zawiera tylko dozwolone znaki (RFC 7636: A-Z, a-z, 0-9, -, ., _, ~)
  if (!/^[A-Za-z0-9\-._~]+$/.test(codeVerifier)) {
    return false;
  }

  // Oblicz oczekiwany challenge
  const expectedChallenge = base64URLEncode(
    createHash('sha256').update(codeVerifier).digest()
  );

  // Porównaj (użyj constant-time comparison dla bezpieczeństwa)
  return constantTimeEqual(expectedChallenge, codeChallenge);
}

/**
 * Koduje buffer do base64url (RFC 4648)
 * 
 * base64url różni się od base64:
 * - + staje się -
 * - / staje się _
 * - = (padding) jest usuwany
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Usuń padding
}

/**
 * Constant-time string comparison
 * Zapobiega timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Waliduje format code_challenge
 */
export function isValidCodeChallenge(codeChallenge: string): boolean {
  if (!codeChallenge || codeChallenge.length < 43 || codeChallenge.length > 128) {
    return false;
  }

  // Sprawdź czy zawiera tylko dozwolone znaki base64url
  return /^[A-Za-z0-9\-._~]+$/.test(codeChallenge);
}

/**
 * Waliduje format code_verifier
 */
export function isValidCodeVerifier(codeVerifier: string): boolean {
  if (!codeVerifier || codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }

  return /^[A-Za-z0-9\-._~]+$/.test(codeVerifier);
}

