import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { decode } from 'next-auth/jwt';

// Mockowanie modułów
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      projects: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('next-auth/jwt', () => ({
  decode: vi.fn(),
}));

// Mockowanie funkcji security - zwracają zawsze sukces w testach
vi.mock('@/lib/security', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 100,
    resetAt: new Date(),
  }),
  generateRateLimitKey: vi.fn().mockReturnValue('test-key'),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  logSuccess: vi.fn().mockResolvedValue(undefined),
  logFailure: vi.fn().mockResolvedValue(undefined),
  extractRequestInfo: vi.fn().mockReturnValue({ ipAddress: '127.0.0.1', userAgent: 'test' }),
  checkProjectAccess: vi.fn().mockResolvedValue({ allowed: true }),
  RATE_LIMIT_CONFIGS: {
    default: { windowMs: 60000, maxRequests: 100 },
    token_verify: { windowMs: 60000, maxRequests: 100 },
  },
}));

describe('API /api/v1/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zwraca 401 gdy brakuje x-api-key', async () => {
    const req = new NextRequest('http://localhost/api/v1/verify', {
      method: 'POST',
      headers: {},
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Missing API Key');
  });

  it('zwraca 403 gdy api key jest nieprawidłowy', async () => {
    // Mock db to return undefined (brak projektu)
    vi.mocked(db.query.projects.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/verify', {
      method: 'POST',
      headers: {
        'x-api-key': 'invalid-key',
      },
      body: JSON.stringify({ token: 'some-token' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Invalid API Key');
  });

  it('zwraca 400 gdy brakuje tokenu', async () => {
    // Mock db to return project
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Proj',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/verify', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({}), // brak tokenu
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing token');
  });

  it('zwraca 200 gdy token jest poprawny', async () => {
    // Mock project
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Proj',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    // Mock decode
    vi.mocked(decode).mockResolvedValue({ sub: 'user1', exp: Date.now() / 1000 + 3600 });

    // Mock user
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      name: 'Test',
      image: null,
      role: 'user',
      tokenVersion: 1,
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/verify', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({ token: 'valid-token' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
    expect(json.user.email).toBe('test@example.com');
  });
});
