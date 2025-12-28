import { describe, it, expect, vi } from 'vitest';
import { signSessionToken, verifySessionToken } from './jwt';
import * as jose from 'jose';

// Mock jose with actual class for SignJWT
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
    // The instruction asks to include a 'key' property in the mockResolvedValue type.
    // jose.JWTVerifyResult typically has 'payload' and 'protectedHeader'.
    // If 'key' is expected, it might be a custom type or a misunderstanding of jose's types.
    // We will add it as requested, assuming the user's context expects it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
