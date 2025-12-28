import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateRedirectUri, isRedirectUriAllowed } from './redirect-uri';

describe('Redirect URI Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  describe('validateRedirectUri', () => {
    describe('Podstawowa walidacja', () => {
      it('odrzuca pusty URI', () => {
        const result = validateRedirectUri('', 'https://example.com');

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Redirect URI is required');
      });

      it('odrzuca URI który nie jest stringiem', () => {
        const result = validateRedirectUri(null as any, 'https://example.com');

        expect(result.valid).toBe(false);
      });

      it('odrzuca URI dłuższy niż 2048 znaków', () => {
        const longUri = 'https://example.com/' + 'a'.repeat(2050);
        const result = validateRedirectUri(longUri, 'https://example.com');

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Redirect URI too long');
      });

      it('odrzuca nieprawidłowy format URL', () => {
        const result = validateRedirectUri('not-a-valid-url', 'https://example.com');

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Invalid URL format');
      });
    });

    describe('Walidacja protokołu (produkcja)', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('akceptuje HTTPS w produkcji', () => {
        const result = validateRedirectUri('https://example.com/callback', 'https://example.com');

        expect(result.valid).toBe(true);
      });

      it('odrzuca HTTP w produkcji (oprócz localhost)', () => {
        const result = validateRedirectUri('http://example.com/callback', 'https://example.com');

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Only HTTPS');
      });

      it('akceptuje localhost HTTP w produkcji', () => {
        const result = validateRedirectUri('http://localhost:3000/callback', 'http://localhost:3000');

        expect(result.valid).toBe(true);
      });

      it('akceptuje 127.0.0.1 HTTP w produkcji', () => {
        const result = validateRedirectUri('http://127.0.0.1:3000/callback', 'http://127.0.0.1:3000');

        expect(result.valid).toBe(true);
      });
    });

    describe('Walidacja domeny', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('akceptuje URI gdy domena się zgadza dokładnie', () => {
        const result = validateRedirectUri(
          'https://example.com/callback',
          'https://example.com'
        );

        expect(result.valid).toBe(true);
      });

      it('odrzuca URI gdy hostname się nie zgadza', () => {
        const result = validateRedirectUri(
          'https://evil.com/callback',
          'https://example.com'
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('hostname does not match');
      });

      it('odrzuca URI z subdomeną gdy nie jest dozwolona', () => {
        const result = validateRedirectUri(
          'https://app.example.com/callback',
          'https://example.com'
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('hostname does not match');
      });

      it('akceptuje URI gdy allowedDomain jest null (brak ograniczeń)', () => {
        const result = validateRedirectUri('https://example.com/callback', null);

        expect(result.valid).toBe(true);
      });

      it('obsługuje domenę bez protokołu', () => {
        const result = validateRedirectUri(
          'https://example.com/callback',
          'example.com'
        );

        expect(result.valid).toBe(true);
      });

      it('odrzuca URI z podejrzanym hostname (path traversal)', () => {
        const result = validateRedirectUri('https://example.com..evil.com/callback', null);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Invalid hostname format');
      });

      it('odrzuca URI z null bytes w hostname', () => {
        const result = validateRedirectUri('https://example.com\0evil.com/callback', null);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Invalid hostname format');
      });
    });

    describe('Walidacja fragmentów', () => {
      it('odrzuca URI z fragmentem (#)', () => {
        const result = validateRedirectUri(
          'https://example.com/callback#token=xyz',
          'https://example.com'
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('fragment');
      });

      it('akceptuje URI bez fragmentu', () => {
        const result = validateRedirectUri(
          'https://example.com/callback?code=xyz',
          'https://example.com'
        );

        expect(result.valid).toBe(true);
      });
    });

    describe('Walidacja podejrzanych parametrów', () => {
      it('odrzuca URI z parametrem redirect zawierającym URL', () => {
        const result = validateRedirectUri(
          'https://example.com/callback?redirect=https://evil.com',
          'https://example.com'
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('suspicious redirect parameter');
      });

      it('akceptuje URI z parametrem redirect zawierającym ścieżkę (nie URL)', () => {
        const result = validateRedirectUri(
          'https://example.com/callback?redirect=/dashboard',
          'https://example.com'
        );

        expect(result.valid).toBe(true);
      });
    });

    describe('Walidacja portów', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('akceptuje standardowe porty (443, 80) w produkcji', () => {
        const result1 = validateRedirectUri(
          'https://example.com:443/callback',
          'https://example.com'
        );
        const result2 = validateRedirectUri(
          'http://example.com:80/callback',
          'http://example.com'
        );

        expect(result1.valid).toBe(true);
        expect(result2.valid).toBe(true);
      });

      it('odrzuca niestandardowe porty w produkcji (oprócz localhost)', () => {
        const result = validateRedirectUri(
          'https://example.com:8080/callback',
          'https://example.com'
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Non-standard ports');
      });
    });
  });

  describe('isRedirectUriAllowed', () => {
    it('zwraca true gdy URI jest dozwolony', () => {
      const result = isRedirectUriAllowed('https://example.com/callback', 'https://example.com');

      expect(result).toBe(true);
    });

    it('zwraca false gdy URI nie jest dozwolony', () => {
      const result = isRedirectUriAllowed('https://evil.com/callback', 'https://example.com');

      expect(result).toBe(false);
    });
  });
});

