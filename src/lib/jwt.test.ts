import { describe, it, expect, vi } from 'vitest';
import { signSessionToken, verifySessionToken } from './jwt';
import * as jose from 'jose';

vi.mock('jose', () => {
  return {
    SignJWT: class {
      constructor(public payload: unknown) {}
      setProtectedHeader() {
        return this;
      }
      setIssuedAt() {
        return this;
      }
      setExpirationTime() {
        return this;
      }
      async sign() {
        return 'mock_token';
      }
    },
    jwtVerify: vi.fn(),
  };
});

describe('JWT Lib', () => {
  it('powinien podpisać token', async () => {
    const payload = { sub: 'user_123' };
    const token = await signSessionToken(payload);

    expect(token).toBe('mock_token');
  });

  it('powinien zweryfikować token', async () => {
    const payload = { sub: 'user_123' };
    vi.mocked(jose.jwtVerify).mockResolvedValueOnce({ payload, key: 'mock_key' } as any);

    const result = await verifySessionToken('valid_token');
    expect(result).toEqual(payload);
  });

  it('powinien zwrócić null dla nieprawidłowego tokena', async () => {
    vi.mocked(jose.jwtVerify).mockRejectedValueOnce(new Error('Invalid token'));

    const result = await verifySessionToken('invalid_token');
    expect(result).toBeNull();
  });
});
