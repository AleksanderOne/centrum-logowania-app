/**
 * Email Domain Whitelist - Ograniczenie rejestracji do dozwolonych domen
 *
 * Jeśli zmienna ALLOWED_EMAIL_DOMAINS jest ustawiona, tylko użytkownicy
 * z dozwolonych domen email mogą się logować.
 * Pusta zmienna = wszystkie domeny dozwolone.
 *
 * Przykład: ALLOWED_EMAIL_DOMAINS=firma.pl,partner.com
 */

/**
 * Lista dozwolonych domen (parsowana z ENV)
 */
function getAllowedDomainsFromEnv(): string[] {
  const domains = process.env.ALLOWED_EMAIL_DOMAINS;
  if (!domains || domains.trim() === '') {
    return [];
  }
  return domains.split(',').map((d) => d.trim().toLowerCase());
}

/**
 * Sprawdza czy domena email jest dozwolona
 * @param email - Email do weryfikacji
 * @returns true jeśli domena jest dozwolona lub brak whitelist
 */
export function isEmailDomainAllowed(email: string): boolean {
  const allowedDomains = getAllowedDomainsFromEnv();

  // Brak whitelist = wszystkie domeny dozwolone
  if (allowedDomains.length === 0) {
    return true;
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return false;
  }

  return allowedDomains.includes(domain);
}

/**
 * Pobiera listę dozwolonych domen (do wyświetlenia użytkownikowi)
 */
export function getAllowedEmailDomains(): string[] {
  return getAllowedDomainsFromEnv();
}

/**
 * Sprawdza czy whitelist jest aktywna
 */
export function isEmailWhitelistEnabled(): boolean {
  return getAllowedDomainsFromEnv().length > 0;
}
