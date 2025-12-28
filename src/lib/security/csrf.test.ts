import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateCSRFToken,
  verifyCSRFToken,
  verifyOrigin,
  getAllowedOrigins,
  requireValidOrigin,
} from './csrf';

describe('CSRF Protection', () => {
  describe('generateCSRFToken', () => {
    it('generuje token w formacie token:signature', () => {
      const secret = 'test-secret';
      const sessionId = 'session-123';

      const token = generateCSRFToken(secret, sessionId);

      expect(token).toMatch(/^[a-f0-9]{64}:[a-f0-9]{64}$/);
      expect(token.split(':')).toHaveLength(2);
    });

    it('generuje różne tokeny dla różnych sessionId', () => {
      const secret = 'test-secret';
      const token1 = generateCSRFToken(secret, 'session-1');
      const token2 = generateCSRFToken(secret, 'session-2');

      expect(token1).not.toBe(token2);
    });

    it('generuje różne tokeny dla różnych secret', () => {
      const sessionId = 'session-123';
      const token1 = generateCSRFToken('secret-1', sessionId);
      const token2 = generateCSRFToken('secret-2', sessionId);

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyCSRFToken', () => {
    const secret = 'test-secret';
    const sessionId = 'session-123';

    it('weryfikuje poprawny token', () => {
      const token = generateCSRFToken(secret, sessionId);
      const isValid = verifyCSRFToken(token, secret, sessionId);

      expect(isValid).toBe(true);
    });

    it('odrzuca token z nieprawidłową sygnaturą', () => {
      const token = generateCSRFToken(secret, sessionId);
      const [tokenPart] = token.split(':');
      const fakeToken = `${tokenPart}:fake-signature`;

      const isValid = verifyCSRFToken(fakeToken, secret, sessionId);

      expect(isValid).toBe(false);
    });

    it('odrzuca token z nieprawidłowym formatem', () => {
      const isValid1 = verifyCSRFToken('invalid', secret, sessionId);
      const isValid2 = verifyCSRFToken('token-without-colon', secret, sessionId);
      const isValid3 = verifyCSRFToken('', secret, sessionId);

      expect(isValid1).toBe(false);
      expect(isValid2).toBe(false);
      expect(isValid3).toBe(false);
    });

    it('odrzuca token dla nieprawidłowego sessionId', () => {
      const token = generateCSRFToken(secret, 'session-123');
      const isValid = verifyCSRFToken(token, secret, 'different-session');

      expect(isValid).toBe(false);
    });

    it('odrzuca token dla nieprawidłowego secret', () => {
      const token = generateCSRFToken(secret, sessionId);
      const isValid = verifyCSRFToken(token, 'wrong-secret', sessionId);

      expect(isValid).toBe(false);
    });
  });

  describe('verifyOrigin', () => {
    const allowedOrigins = ['https://example.com', 'https://app.example.com'];

    it('akceptuje request z dozwolonego origin', () => {
      const request = new Request('https://api.example.com/test', {
        method: 'POST',
        headers: { origin: 'https://example.com' },
      });

      const isValid = verifyOrigin(request, allowedOrigins);

      expect(isValid).toBe(true);
    });

    it('odrzuca request z niedozwolonego origin', () => {
      const request = new Request('https://api.example.com/test', {
        method: 'POST',
        headers: { origin: 'https://evil.com' },
      });

      const isValid = verifyOrigin(request, allowedOrigins);

      expect(isValid).toBe(false);
    });

    it('akceptuje request z dozwolonego referer gdy brak origin', () => {
      const request = new Request('https://api.example.com/test', {
        method: 'POST',
        headers: { referer: 'https://example.com/page' },
      });

      const isValid = verifyOrigin(request, allowedOrigins);

      expect(isValid).toBe(true);
    });

    it('odrzuca request z niedozwolonego referer gdy brak origin', () => {
      const request = new Request('https://api.example.com/test', {
        method: 'POST',
        headers: { referer: 'https://evil.com/page' },
      });

      const isValid = verifyOrigin(request, allowedOrigins);

      expect(isValid).toBe(false);
    });

    it('akceptuje GET request bez origin i referer', () => {
      const request = new Request('https://api.example.com/test', {
        method: 'GET',
      });

      const isValid = verifyOrigin(request, allowedOrigins);

      expect(isValid).toBe(true);
    });

    it('odrzuca POST request bez origin i referer', () => {
      const request = new Request('https://api.example.com/test', {
        method: 'POST',
      });

      const isValid = verifyOrigin(request, allowedOrigins);

      expect(isValid).toBe(false);
    });

    it('odrzuca request z nieprawidłowym referer URL', () => {
      const request = new Request('https://api.example.com/test', {
        method: 'POST',
        headers: { referer: 'not-a-valid-url' },
      });

      const isValid = verifyOrigin(request, allowedOrigins);

      expect(isValid).toBe(false);
    });

    it('preferuje origin nad referer', () => {
      const request = new Request('https://api.example.com/test', {
        method: 'POST',
        headers: {
          origin: 'https://example.com',
          referer: 'https://evil.com/page',
        },
      });

      const isValid = verifyOrigin(request, allowedOrigins);

      expect(isValid).toBe(true); // Origin jest dozwolony
    });
  });

  describe('getAllowedOrigins', () => {
    beforeEach(() => {
      vi.resetModules();
      vi.unstubAllEnvs();
    });

    it('zwraca originy z ALLOWED_ORIGINS env', () => {
      vi.stubEnv('ALLOWED_ORIGINS', 'https://site1.com,https://site2.com');

      const origins = getAllowedOrigins();

      expect(origins).toEqual(['https://site1.com', 'https://site2.com']);
    });

    it('trimuje białe znaki z originów', () => {
      vi.stubEnv('ALLOWED_ORIGINS', 'https://site1.com , https://site2.com ');

      const origins = getAllowedOrigins();

      expect(origins).toEqual(['https://site1.com', 'https://site2.com']);
    });

    it('zwraca pustą tablicę gdy brak ALLOWED_ORIGINS i NEXTAUTH_URL', () => {
      // Domyślnie mockowane środowisko jest czyste po unstubAllEnvs jeśli nic nie ustawimy
      // Ale jeśli process.env ma już wartości z systemu, trzeba je nadpisać undefined
      vi.stubEnv('ALLOWED_ORIGINS', undefined);
      vi.stubEnv('NEXTAUTH_URL', undefined);

      const origins = getAllowedOrigins();

      expect(origins).toEqual([]);
    });

    it('zwraca NEXTAUTH_URL gdy brak ALLOWED_ORIGINS', () => {
      vi.stubEnv('ALLOWED_ORIGINS', undefined);
      vi.stubEnv('NEXTAUTH_URL', 'https://auth.example.com');

      const origins = getAllowedOrigins();

      expect(origins).toEqual(['https://auth.example.com']);
    });
  });

  describe('requireValidOrigin', () => {
    beforeEach(() => {
      vi.resetModules();
      vi.unstubAllEnvs();
    });

    it('akceptuje request z dozwolonego origin', () => {
      vi.stubEnv('ALLOWED_ORIGINS', 'https://example.com');
      vi.stubEnv('NODE_ENV', 'production');

      const request = new Request('https://api.example.com/test', {
        method: 'POST',
        headers: { origin: 'https://example.com' },
      });

      const isValid = requireValidOrigin(request);

      expect(isValid).toBe(true);
    });

    it('dodaje localhost w development', () => {
      vi.stubEnv('ALLOWED_ORIGINS', 'https://example.com');
      vi.stubEnv('NODE_ENV', 'development');

      const request = new Request('https://api.example.com/test', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      });

      const isValid = requireValidOrigin(request);

      expect(isValid).toBe(true);
    });

    it('akceptuje 127.0.0.1 w development', () => {
      vi.stubEnv('ALLOWED_ORIGINS', 'https://example.com');
      vi.stubEnv('NODE_ENV', 'development');

      const request = new Request('https://api.example.com/test', {
        method: 'POST',
        headers: { origin: 'http://127.0.0.1:3000' },
      });

      const isValid = requireValidOrigin(request);

      expect(isValid).toBe(true);
    });

    it('odrzuca localhost w production', () => {
      vi.stubEnv('ALLOWED_ORIGINS', 'https://example.com');
      vi.stubEnv('NODE_ENV', 'production');

      const request = new Request('https://api.example.com/test', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      });

      const isValid = requireValidOrigin(request);

      expect(isValid).toBe(false);
    });
  });
});
