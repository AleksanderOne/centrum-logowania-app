import { describe, it, expect } from 'vitest';
import {
  generatePKCEPair,
  verifyPKCE,
  isValidCodeChallenge,
  isValidCodeVerifier,
} from './pkce';

describe('PKCE (Proof Key for Code Exchange)', () => {
  describe('generatePKCEPair', () => {
    it('generuje parę PKCE z poprawnym formatem', () => {
      const pair = generatePKCEPair();

      expect(pair).toHaveProperty('codeVerifier');
      expect(pair).toHaveProperty('codeChallenge');
      expect(pair).toHaveProperty('codeChallengeMethod');
      expect(pair.codeChallengeMethod).toBe('S256');
    });

    it('generuje codeVerifier o odpowiedniej długości (43-128 znaków)', () => {
      const pair = generatePKCEPair();

      expect(pair.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(pair.codeVerifier.length).toBeLessThanOrEqual(128);
    });

    it('generuje codeChallenge o odpowiedniej długości', () => {
      const pair = generatePKCEPair();

      expect(pair.codeChallenge.length).toBeGreaterThanOrEqual(43);
      expect(pair.codeChallenge.length).toBeLessThanOrEqual(128);
    });

    it('generuje różne pary przy każdym wywołaniu', () => {
      const pair1 = generatePKCEPair();
      const pair2 = generatePKCEPair();

      expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
      expect(pair1.codeChallenge).not.toBe(pair2.codeChallenge);
    });

    it('generuje codeVerifier tylko z dozwolonych znaków (base64url)', () => {
      const pair = generatePKCEPair();
      const allowedChars = /^[A-Za-z0-9\-._~]+$/;

      expect(pair.codeVerifier).toMatch(allowedChars);
      expect(pair.codeChallenge).toMatch(allowedChars);
    });
  });

  describe('verifyPKCE', () => {
    it('weryfikuje poprawną parę codeVerifier i codeChallenge', () => {
      const pair = generatePKCEPair();
      const isValid = verifyPKCE(pair.codeVerifier, pair.codeChallenge);

      expect(isValid).toBe(true);
    });

    it('odrzuca nieprawidłowy codeVerifier', () => {
      const pair = generatePKCEPair();
      const isValid = verifyPKCE('wrong-verifier', pair.codeChallenge);

      expect(isValid).toBe(false);
    });

    it('odrzuca nieprawidłowy codeChallenge', () => {
      const pair = generatePKCEPair();
      const isValid = verifyPKCE(pair.codeVerifier, 'wrong-challenge');

      expect(isValid).toBe(false);
    });

    it('odrzuca codeVerifier o nieprawidłowej długości (za krótki)', () => {
      const pair = generatePKCEPair();
      const shortVerifier = 'short';
      const isValid = verifyPKCE(shortVerifier, pair.codeChallenge);

      expect(isValid).toBe(false);
    });

    it('odrzuca codeVerifier o nieprawidłowej długości (za długi)', () => {
      const pair = generatePKCEPair();
      const longVerifier = 'a'.repeat(200); // Powyżej 128 znaków
      const isValid = verifyPKCE(longVerifier, pair.codeChallenge);

      expect(isValid).toBe(false);
    });

    it('odrzuca codeVerifier z nieprawidłowymi znakami', () => {
      const pair = generatePKCEPair();
      const invalidVerifier = 'a'.repeat(43) + '@#$%'; // Nieprawidłowe znaki
      const isValid = verifyPKCE(invalidVerifier, pair.codeChallenge);

      expect(isValid).toBe(false);
    });

    it('działa z wieloma różnymi parami jednocześnie', () => {
      const pairs = Array.from({ length: 10 }, () => generatePKCEPair());

      pairs.forEach((pair) => {
        const isValid = verifyPKCE(pair.codeVerifier, pair.codeChallenge);
        expect(isValid).toBe(true);
      });
    });
  });

  describe('isValidCodeChallenge', () => {
    it('akceptuje poprawny codeChallenge', () => {
      const pair = generatePKCEPair();
      const isValid = isValidCodeChallenge(pair.codeChallenge);

      expect(isValid).toBe(true);
    });

    it('odrzuca codeChallenge za krótki (< 43 znaki)', () => {
      const isValid = isValidCodeChallenge('short');

      expect(isValid).toBe(false);
    });

    it('odrzuca codeChallenge za długi (> 128 znaków)', () => {
      const longChallenge = 'a'.repeat(200);
      const isValid = isValidCodeChallenge(longChallenge);

      expect(isValid).toBe(false);
    });

    it('odrzuca codeChallenge z nieprawidłowymi znakami', () => {
      const invalidChallenge = 'a'.repeat(43) + '@#$%';
      const isValid = isValidCodeChallenge(invalidChallenge);

      expect(isValid).toBe(false);
    });

    it('akceptuje codeChallenge z dozwolonymi znakami base64url', () => {
      const validChallenge = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      const isValid = isValidCodeChallenge(validChallenge);

      expect(isValid).toBe(true);
    });
  });

  describe('isValidCodeVerifier', () => {
    it('akceptuje poprawny codeVerifier', () => {
      const pair = generatePKCEPair();
      const isValid = isValidCodeVerifier(pair.codeVerifier);

      expect(isValid).toBe(true);
    });

    it('odrzuca codeVerifier za krótki (< 43 znaki)', () => {
      const isValid = isValidCodeVerifier('short');

      expect(isValid).toBe(false);
    });

    it('odrzuca codeVerifier za długi (> 128 znaków)', () => {
      const longVerifier = 'a'.repeat(200);
      const isValid = isValidCodeVerifier(longVerifier);

      expect(isValid).toBe(false);
    });

    it('odrzuca codeVerifier z nieprawidłowymi znakami', () => {
      const invalidVerifier = 'a'.repeat(43) + '@#$%';
      const isValid = isValidCodeVerifier(invalidVerifier);

      expect(isValid).toBe(false);
    });

    it('akceptuje codeVerifier o dokładnie 43 znakach', () => {
      const validVerifier = 'a'.repeat(43);
      const isValid = isValidCodeVerifier(validVerifier);

      expect(isValid).toBe(true);
    });

    it('akceptuje codeVerifier o dokładnie 128 znakach', () => {
      const validVerifier = 'a'.repeat(128);
      const isValid = isValidCodeVerifier(validVerifier);

      expect(isValid).toBe(true);
    });
  });

  describe('Integracja end-to-end', () => {
    it('generuje i weryfikuje pełny flow PKCE', () => {
      // Krok 1: Klient generuje parę
      const pair = generatePKCEPair();

      // Krok 2: Klient wysyła codeChallenge do serwera
      expect(isValidCodeChallenge(pair.codeChallenge)).toBe(true);

      // Krok 3: Serwer zapisuje codeChallenge
      const savedChallenge = pair.codeChallenge;

      // Krok 4: Klient wysyła codeVerifier
      expect(isValidCodeVerifier(pair.codeVerifier)).toBe(true);

      // Krok 5: Serwer weryfikuje
      const isValid = verifyPKCE(pair.codeVerifier, savedChallenge);
      expect(isValid).toBe(true);
    });

    it('nie pozwala na użycie codeVerifier z innej pary', () => {
      const pair1 = generatePKCEPair();
      const pair2 = generatePKCEPair();

      const isValid = verifyPKCE(pair1.codeVerifier, pair2.codeChallenge);

      expect(isValid).toBe(false);
    });
  });
});

