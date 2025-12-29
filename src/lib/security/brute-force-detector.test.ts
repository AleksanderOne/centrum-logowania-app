import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkBruteForceByIp,
  checkBruteForceByEmail,
  cleanupOldAuditLogs,
} from './brute-force-detector';

// -- MOCK SETUP --
// Używamy vi.hoisted, aby mocki były dostępne zarówno w factory vi.mock, jak i w testach.
const mocks = vi.hoisted(() => {
  const mockChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve([])), // Domyślnie zwraca pustą tablicę
  };

  const mockSelect = vi.fn(() => mockChain);
  const mockDelete = vi.fn(() => ({
    where: vi.fn(),
  }));

  return {
    mockChain,
    mockSelect,
    mockDelete,
  };
});

// Mockowanie modułu DB
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: mocks.mockSelect,
    delete: mocks.mockDelete,
  },
}));

// Mockowanie drizzle-orm (helperów SQL)
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
    // Reset implementations using the hoisted mocks object
    mocks.mockChain.from.mockReturnThis();
    mocks.mockChain.where.mockReturnThis();
    mocks.mockChain.orderBy.mockReturnThis();
    mocks.mockChain.limit.mockReturnThis();
    mocks.mockChain.then.mockImplementation((resolve) => resolve([]));
  });

  describe('checkBruteForceByIp', () => {
    it('wywołuje checkBruteForce z IP address', async () => {
      mocks.mockChain.then.mockImplementationOnce((resolve: any) => resolve([{ count: 0 }]));

      const result = await checkBruteForceByIp('192.168.1.1', 'login');

      expect(result.isBruteForce).toBe(false);
      expect(result.attempts).toBe(0);
      expect(mocks.mockSelect).toHaveBeenCalled();
      expect(mocks.mockChain.from).toHaveBeenCalled();
      expect(mocks.mockChain.where).toHaveBeenCalled();
    });

    it('wykrywa brute force gdy próby przekraczają próg', async () => {
      // Setup mocka:
      // 1. Zapytanie o licznik (count) -> zwraca 6
      // 2. Zapytanie o najstarszy log (oldestFailure) -> zwraca datę
      const now = new Date();
      const mockOldDate = new Date(now.getTime() - 10000); // 10 sek temu

      mocks.mockChain.then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 6 }])) // count query
        .mockImplementationOnce((resolve: any) => resolve([{ createdAt: mockOldDate }])); // oldestFailure query

      const result = await checkBruteForceByIp('192.168.1.1', 'login');

      expect(result.isBruteForce).toBe(true);
      expect(result.attempts).toBe(6);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('checkBruteForceByEmail', () => {
    it('wywołuje checkBruteForce z email', async () => {
      mocks.mockChain.then.mockImplementationOnce((resolve: any) => resolve([{ count: 0 }]));

      const result = await checkBruteForceByEmail('test@example.com', 'login');

      expect(result.isBruteForce).toBe(false);
      expect(mocks.mockSelect).toHaveBeenCalled();
    });
  });

  describe('cleanupOldAuditLogs', () => {
    it('zwraca liczbę usuniętych logów', async () => {
      // Mock db.delete().where()
      const mockWhere = vi.fn().mockReturnValue(Promise.resolve({ rowCount: 42 }));
      mocks.mockDelete.mockReturnValue({ where: mockWhere });

      const deletedCount = await cleanupOldAuditLogs(90);

      expect(mocks.mockDelete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
      expect(deletedCount).toBe(42);
    });

    it('zwraca 0 gdy brak rowCount', async () => {
      const mockWhere = vi.fn().mockReturnValue(Promise.resolve({})); // Brak rowCount
      mocks.mockDelete.mockReturnValue({ where: mockWhere });

      const deletedCount = await cleanupOldAuditLogs(90);

      expect(deletedCount).toBe(0);
    });

    it('używa domyślnej wartości 90 dni gdy nie podano', async () => {
      const mockWhere = vi.fn().mockReturnValue(Promise.resolve({ rowCount: 1 }));
      mocks.mockDelete.mockReturnValue({ where: mockWhere });

      await cleanupOldAuditLogs();

      expect(mocks.mockDelete).toHaveBeenCalled();
    });
  });
});
