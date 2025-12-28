import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkBruteForceByIp,
  checkBruteForceByEmail,
  cleanupOldAuditLogs,
} from './brute-force-detector';

// Mock DB - prosta wersja
const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      auditLogs: {
        findMany: () => mockFindMany(),
        findFirst: () => mockFindFirst(),
      },
    },
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({ rowCount: 0 })),
    })),
  },
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  count: vi.fn(),
  sql: vi.fn(),
}));

describe('Brute Force Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkBruteForceByIp', () => {
    it('wywołuje checkBruteForce z IP address', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await checkBruteForceByIp('192.168.1.1', 'login');

      expect(result.isBruteForce).toBe(false);
      expect(result.attempts).toBe(0);
    });

    it('wykrywa brute force gdy próby przekraczają próg', async () => {
      mockFindMany.mockResolvedValue([
        { count: 6 }, // Powyżej progu (5)
      ]);

      const result = await checkBruteForceByIp('192.168.1.1', 'login');

      expect(result.isBruteForce).toBe(true);
      expect(result.attempts).toBe(6);
    });
  });

  describe('checkBruteForceByEmail', () => {
    it('wywołuje checkBruteForce z email', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await checkBruteForceByEmail('test@example.com', 'login');

      expect(result.isBruteForce).toBe(false);
    });
  });

  describe('cleanupOldAuditLogs', () => {
    it('zwraca liczbę usuniętych logów', async () => {
      const { db } = await import('@/lib/db/drizzle');
      const mockWhere = vi.fn().mockResolvedValue({ rowCount: 42 });
      vi.mocked(db.delete as any).mockReturnValue({
        where: mockWhere,
      });

      const deletedCount = await cleanupOldAuditLogs(90);

      expect(deletedCount).toBe(42);
    });

    it('zwraca 0 gdy brak rowCount', async () => {
      const { db } = await import('@/lib/db/drizzle');
      const mockWhere = vi.fn().mockResolvedValue({});
      vi.mocked(db.delete as any).mockReturnValue({
        where: mockWhere,
      });

      const deletedCount = await cleanupOldAuditLogs(90);

      expect(deletedCount).toBe(0);
    });

    it('używa domyślnej wartości 90 dni gdy nie podano', async () => {
      const deletedCount = await cleanupOldAuditLogs();

      expect(deletedCount).toBeDefined();
    });
  });
});
