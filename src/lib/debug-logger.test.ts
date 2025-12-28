import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { appendToLogFile, serverLog, httpLog } from './debug-logger';
import fs from 'fs';

// Mock fs and path
vi.mock('fs', () => ({
  default: {
    appendFileSync: vi.fn(),
  },
}));

// Mock console.error
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('debug-logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'development'); // Default to dev for tests
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('appendToLogFile', () => {
    it('nie robi nic jeśli nie jest w mode development', () => {
      vi.stubEnv('NODE_ENV', 'production');
      appendToLogFile('cla-server', 'test message');
      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });

    it('zapisuje logi w mode development', () => {
      appendToLogFile('cla-server', 'test message');
      expect(fs.appendFileSync).toHaveBeenCalled();
      const callArgs = vi.mocked(fs.appendFileSync).mock.calls[0];
      expect(callArgs[0]).toContain('logi.txt');
      expect(callArgs[1]).toContain('[CLA-SERVER] test message');
    });

    it('zapisuje dane dodatkowe (JSON)', () => {
      const data = { key: 'value' };
      appendToLogFile('cla-server', 'msg', data);
      const callArgs = vi.mocked(fs.appendFileSync).mock.calls[0];
      const content = callArgs[1] as string;
      expect(content).toContain('DATA:');
      expect(content).toContain('"key": "value"');
    });

    it('przycina zbyt długie dane JSON', () => {
      // Create huge json
      const hugeString = 'a'.repeat(6000);
      const data = { heavy: hugeString };

      appendToLogFile('cla-server', 'heavy json', data);

      const callArgs = vi.mocked(fs.appendFileSync).mock.calls[0];
      const content = callArgs[1] as string;
      expect(content).toContain('... (truncated)');
    });

    it('obsługuje błędy serializacji JSON (circular reference)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circular: any = {};
      circular.myself = circular;

      appendToLogFile('cla-server', 'circular', circular);
      const callArgs = vi.mocked(fs.appendFileSync).mock.calls[0];
      const content = callArgs[1] as string;
      expect(content).toContain('[Circular/Invalid JSON]');
    });

    it('obsługuje błędy zapisu do pliku (fail silently)', () => {
      vi.mocked(fs.appendFileSync).mockImplementationOnce(() => {
        throw new Error('Write error');
      });

      // Should not throw
      expect(() => appendToLogFile('cla-server', 'msg')).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to write to log file');
    });
  });

  describe('serverLog', () => {
    it('wywołuje appendToLogFile z kategorią cla-server', () => {
      serverLog('server msg', { a: 1 });
      const callArgs = vi.mocked(fs.appendFileSync).mock.calls[0];
      expect(callArgs[1]).toContain('[CLA-SERVER] server msg');
    });
  });

  describe('httpLog', () => {
    it('formatuje logi HTTP', () => {
      httpLog('GET', '/api/test', 200, 50);
      const callArgs = vi.mocked(fs.appendFileSync).mock.calls[0];
      const content = callArgs[1] as string;
      expect(content).toContain('📥 GET /api/test → 200 (50ms)');
    });

    it('obsługuje inne metody HTTP', () => {
      httpLog('POST', '/api/create');
      const content = vi.mocked(fs.appendFileSync).mock.calls[0][1] as string;
      expect(content).toContain('📤 POST /api/create');
    });

    it('obsługuje DELETE', () => {
      httpLog('DELETE', '/api/del');
      const content = vi.mocked(fs.appendFileSync).mock.calls[0][1] as string;
      expect(content).toContain('🗑️ DELETE /api/del');
    });
  });
});
