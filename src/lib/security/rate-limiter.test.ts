import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkRateLimit,
  generateRateLimitKey,
  cleanupExpiredRateLimits,
  getClientIp,
  RATE_LIMIT_CONFIGS,
} from './rate-limiter';
import { db } from '@/lib/db/drizzle';

// Mockowanie modułu bazy danych
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      rateLimitEntries: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 5 }),
    }),
  },
}));

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('powinien mieć zdefiniowane konfiguracje dla różnych typów endpointów', () => {
      expect(RATE_LIMIT_CONFIGS.auth).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.tokenExchange).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.sessionVerify).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.api).toBeDefined();
    });

    it('auth powinien być najbardziej restrykcyjny', () => {
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBeLessThan(RATE_LIMIT_CONFIGS.api.maxRequests);
    });

    it('sessionVerify powinien być najbardziej liberalny', () => {
      expect(RATE_LIMIT_CONFIGS.sessionVerify.maxRequests).toBeGreaterThan(
        RATE_LIMIT_CONFIGS.api.maxRequests
      );
    });
  });

  describe('generateRateLimitKey', () => {
    it('powinien generować klucz w formacie ip:endpoint', () => {
      const key = generateRateLimitKey('192.168.1.1', 'api/v1/token');
      expect(key).toBe('ip:192.168.1.1:api/v1/token');
    });

    it('powinien obsługiwać IPv6', () => {
      const key = generateRateLimitKey('::1', 'api/v1/token');
      expect(key).toBe('ip:::1:api/v1/token');
    });
  });

  describe('getClientIp', () => {
    it('powinien zwrócić IP z x-forwarded-for', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      });
      expect(getClientIp(request)).toBe('1.2.3.4');
    });

    it('powinien zwrócić IP z x-real-ip jako fallback', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '9.10.11.12' },
      });
      expect(getClientIp(request)).toBe('9.10.11.12');
    });

    it('powinien zwrócić "unknown" gdy brak nagłówków IP', () => {
      const request = new Request('http://localhost');
      expect(getClientIp(request)).toBe('unknown');
    });

    it('powinien preferować x-forwarded-for nad x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '1.2.3.4',
          'x-real-ip': '9.10.11.12',
        },
      });
      expect(getClientIp(request)).toBe('1.2.3.4');
    });
  });

  describe('checkRateLimit', () => {
    const config = { windowMs: 60000, maxRequests: 10 };

    it('powinien zezwolić na pierwszy request i utworzyć wpis', async () => {
      vi.mocked(db.query.rateLimitEntries.findFirst).mockResolvedValue(undefined);

      const result = await checkRateLimit('test-key', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 1
      expect(db.insert).toHaveBeenCalled();
    });

    it('powinien zezwolić i zmniejszyć remaining gdy poniżej limitu', async () => {
      const futureDate = new Date(Date.now() + 30000);
      vi.mocked(db.query.rateLimitEntries.findFirst).mockResolvedValue({
        id: 'entry1',
        key: 'test-key',
        count: 5,
        expiresAt: futureDate,
        windowStart: new Date(),
      } as Awaited<ReturnType<typeof db.query.rateLimitEntries.findFirst>>);

      const result = await checkRateLimit('test-key', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 10 - 5 - 1
      expect(db.update).toHaveBeenCalled();
    });

    it('powinien zablokować gdy limit osiągnięty', async () => {
      const futureDate = new Date(Date.now() + 30000);
      vi.mocked(db.query.rateLimitEntries.findFirst).mockResolvedValue({
        id: 'entry1',
        key: 'test-key',
        count: 10, // Osiągnięto limit
        expiresAt: futureDate,
        windowStart: new Date(),
      } as Awaited<ReturnType<typeof db.query.rateLimitEntries.findFirst>>);

      const result = await checkRateLimit('test-key', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('powinien zwrócić poprawny resetAt', async () => {
      const futureDate = new Date(Date.now() + 45000);
      vi.mocked(db.query.rateLimitEntries.findFirst).mockResolvedValue({
        id: 'entry1',
        key: 'test-key',
        count: 10,
        expiresAt: futureDate,
        windowStart: new Date(),
      } as Awaited<ReturnType<typeof db.query.rateLimitEntries.findFirst>>);

      const result = await checkRateLimit('test-key', config);

      expect(result.resetAt).toEqual(futureDate);
    });
  });

  describe('cleanupExpiredRateLimits', () => {
    it('powinien usunąć wygasłe wpisy i zwrócić liczbę usuniętych', async () => {
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 5 }),
      } as unknown as ReturnType<typeof db.delete>);

      const result = await cleanupExpiredRateLimits();

      expect(db.delete).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('powinien zwrócić -1 gdy rowCount jest undefined', async () => {
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      } as unknown as ReturnType<typeof db.delete>);

      const result = await cleanupExpiredRateLimits();

      expect(result).toBe(-1);
    });
  });
});
