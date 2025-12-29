import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logAuditEvent,
  logSuccess,
  logFailure,
  extractRequestInfo,
  AuditLogEntry,
} from './audit-logger';
import { db } from '@/lib/db/drizzle';

// Mockowanie modułu bazy danych
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('Audit Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractRequestInfo', () => {
    it('powinien wyciągnąć IP z x-forwarded-for', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
          'user-agent': 'TestAgent/1.0',
        },
      });

      const info = extractRequestInfo(request);

      expect(info.ipAddress).toBe('1.2.3.4');
      expect(info.userAgent).toBe('TestAgent/1.0');
    });

    it('powinien użyć x-real-ip jako fallback', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '9.10.11.12',
          'user-agent': 'TestAgent/2.0',
        },
      });

      const info = extractRequestInfo(request);

      expect(info.ipAddress).toBe('9.10.11.12');
    });

    it('powinien zwrócić "unknown" gdy brak nagłówków', () => {
      const request = new Request('http://localhost');

      const info = extractRequestInfo(request);

      expect(info.ipAddress).toBe('unknown');
      expect(info.userAgent).toBe('unknown');
    });
  });

  describe('logAuditEvent', () => {
    it('powinien zapisać zdarzenie z wszystkimi polami', async () => {
      const entry: AuditLogEntry = {
        userId: 'user123',
        projectId: 'project456',
        action: 'login',
        status: 'success',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { source: 'google' },
      };

      await logAuditEvent(entry);

      expect(db.insert).toHaveBeenCalled();
      const insertMock = vi.mocked(db.insert);
      const valuesMock = insertMock.mock.results[0].value.values;
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          projectId: 'project456',
          action: 'login',
          status: 'success',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: JSON.stringify({ source: 'google' }),
        })
      );
    });

    it('powinien obsłużyć brak opcjonalnych pól', async () => {
      const entry: AuditLogEntry = {
        action: 'rate_limited',
        status: 'failure',
      };

      await logAuditEvent(entry);

      expect(db.insert).toHaveBeenCalled();
      const insertMock = vi.mocked(db.insert);
      const valuesMock = insertMock.mock.results[0].value.values;
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          projectId: null,
          ipAddress: null,
          userAgent: null,
          metadata: null,
        })
      );
    });

    it('powinien obsłużyć błąd FK violation dla userId (kod 23503)', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubEnv('NODE_ENV', 'development');

      // Pierwszy insert rzuca FK violation
      const fkError = { code: '23503', constraint: 'audit_log_user_id_fkey' };
      vi.mocked(db.insert).mockReturnValueOnce({
        values: vi.fn().mockRejectedValueOnce(fkError),
      } as any);

      // Drugi insert (retry) się udaje
      vi.mocked(db.insert).mockReturnValueOnce({
        values: vi.fn().mockResolvedValueOnce(undefined),
      } as any);

      const entry: AuditLogEntry = {
        userId: 'nonexistent-user',
        action: 'login',
        status: 'success',
      };

      await logAuditEvent(entry);

      // Powinien zalogować warning w development
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('User nonexistent-user not found')
      );

      // Powinien spróbować ponownie bez userId
      expect(db.insert).toHaveBeenCalledTimes(2);

      vi.unstubAllEnvs();
      consoleWarnSpy.mockRestore();
    });

    it('powinien obsłużyć błąd FK violation dla projectId', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubEnv('NODE_ENV', 'development');

      const fkError = { code: '23503', constraint: 'audit_log_project_id_fkey' };
      vi.mocked(db.insert).mockReturnValueOnce({
        values: vi.fn().mockRejectedValueOnce(fkError),
      } as any);

      vi.mocked(db.insert).mockReturnValueOnce({
        values: vi.fn().mockResolvedValueOnce(undefined),
      } as any);

      const entry: AuditLogEntry = {
        projectId: 'deleted-project',
        action: 'token_exchange',
        status: 'failure',
      };

      await logAuditEvent(entry);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Project deleted-project not found')
      );

      vi.unstubAllEnvs();
      consoleWarnSpy.mockRestore();
    });

    it('powinien zalogować błąd przy innych wyjątkach', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const genericError = new Error('Database connection failed');
      vi.mocked(db.insert).mockReturnValueOnce({
        values: vi.fn().mockRejectedValueOnce(genericError),
      } as any);

      const entry: AuditLogEntry = {
        action: 'logout',
        status: 'success',
      };

      await logAuditEvent(entry);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AuditLogger] Failed to log event:',
        genericError,
        entry
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('logSuccess', () => {
    it('powinien wywołać logAuditEvent ze statusem "success"', async () => {
      await logSuccess('login', {
        userId: 'user1',
        ipAddress: '1.2.3.4',
      });

      expect(db.insert).toHaveBeenCalled();
      const insertMock = vi.mocked(db.insert);
      const valuesMock = insertMock.mock.results[0].value.values;
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login',
          status: 'success',
          userId: 'user1',
        })
      );
    });
  });

  describe('logFailure', () => {
    it('powinien wywołać logAuditEvent ze statusem "failure"', async () => {
      await logFailure('access_denied', {
        userId: 'user2',
        projectId: 'project1',
        metadata: { reason: 'project_private' },
      });

      expect(db.insert).toHaveBeenCalled();
      const insertMock = vi.mocked(db.insert);
      const valuesMock = insertMock.mock.results[0].value.values;
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'access_denied',
          status: 'failure',
          userId: 'user2',
          projectId: 'project1',
        })
      );
    });
  });
});
