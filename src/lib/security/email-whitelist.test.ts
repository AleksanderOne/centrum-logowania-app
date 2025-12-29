/** @vitest-environment node */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Importujemy bezpośrednio moduł, nie przez index, aby móc mockować ENV
describe('Email Domain Whitelist', () => {
  const originalEnv = process.env.ALLOWED_EMAIL_DOMAINS;

  afterEach(() => {
    // Przywróć oryginalne środowisko
    if (originalEnv === undefined) {
      delete process.env.ALLOWED_EMAIL_DOMAINS;
    } else {
      process.env.ALLOWED_EMAIL_DOMAINS = originalEnv;
    }
    // Resetuj cache modułu
    vi.resetModules();
  });

  it('powinien zezwolić na wszystkie domeny jeśli whitelist jest pusty', async () => {
    delete process.env.ALLOWED_EMAIL_DOMAINS;
    const { isEmailDomainAllowed } = await import('@/lib/security/email-whitelist');

    expect(isEmailDomainAllowed('user@random-domain.com')).toBe(true);
    expect(isEmailDomainAllowed('admin@firma.pl')).toBe(true);
    expect(isEmailDomainAllowed('test@gmail.com')).toBe(true);
  });

  it('powinien zezwolić tylko na dozwolone domeny jeśli whitelist jest ustawiony', async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = 'firma.pl,partner.com';
    const { isEmailDomainAllowed } = await import('@/lib/security/email-whitelist');

    expect(isEmailDomainAllowed('user@firma.pl')).toBe(true);
    expect(isEmailDomainAllowed('admin@partner.com')).toBe(true);
    expect(isEmailDomainAllowed('hacker@evil.com')).toBe(false);
    expect(isEmailDomainAllowed('user@gmail.com')).toBe(false);
  });

  it('powinien być case-insensitive', async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = 'Firma.PL';
    const { isEmailDomainAllowed } = await import('@/lib/security/email-whitelist');

    expect(isEmailDomainAllowed('user@FIRMA.pl')).toBe(true);
    expect(isEmailDomainAllowed('user@firma.PL')).toBe(true);
  });

  it('powinien zwrócić listę dozwolonych domen', async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = 'a.com, b.com, c.pl';
    const { getAllowedEmailDomains } = await import('@/lib/security/email-whitelist');

    const domains = getAllowedEmailDomains();
    expect(domains).toContain('a.com');
    expect(domains).toContain('b.com');
    expect(domains).toContain('c.pl');
    expect(domains).toHaveLength(3);
  });

  it('powinien poprawnie raportować czy whitelist jest aktywny', async () => {
    delete process.env.ALLOWED_EMAIL_DOMAINS;
    const { isEmailWhitelistEnabled: check1 } = await import('@/lib/security/email-whitelist');
    expect(check1()).toBe(false);

    vi.resetModules();
    process.env.ALLOWED_EMAIL_DOMAINS = 'test.com';
    const { isEmailWhitelistEnabled: check2 } = await import('@/lib/security/email-whitelist');
    expect(check2()).toBe(true);
  });
});
