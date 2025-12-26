import { describe, it, expect } from 'vitest';
import { cn } from './utils';

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
