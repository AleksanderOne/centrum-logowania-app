import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, devLog } from './utils';

describe('cn (className utility)', () => {
  it('łączy klasy CSS', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('merguje konflikty Tailwind (ostatnia wygrywa)', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('obsługuje warunki', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toBe('base active');
  });

  it('ignoruje falsy values', () => {
    const result = cn('base', false, null, undefined, 'end');
    expect(result).toBe('base end');
  });

  it('obsługuje obiekty klas', () => {
    const result = cn('base', { active: true, disabled: false });
    expect(result).toBe('base active');
  });

  it('obsługuje tablice', () => {
    const result = cn(['class1', 'class2']);
    expect(result).toBe('class1 class2');
  });

  it('zwraca pusty string dla pustych argumentów', () => {
    const result = cn();
    expect(result).toBe('');
  });
});

describe('devLog', () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    consoleSpy.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loguje w trybie development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    devLog('test message', 123);
    expect(consoleSpy).toHaveBeenCalledWith('test message', 123);
  });

  it('nie loguje w trybie production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    devLog('test message', 123);
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
