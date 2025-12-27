import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';

// Mockowanie modułów bazy danych
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

// Mockowanie funkcji security
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
    sessionVerify: { windowMs: 60000, maxRequests: 500 },
  },
}));

describe('API /api/v1/session/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zwraca 401 gdy brakuje x-api-key', async () => {
    const req = new NextRequest('http://localhost/api/v1/session/verify', {
      method: 'POST',
      headers: {},
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Missing API Key');
  });

  it('zwraca 403 gdy api key jest nieprawidłowy', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/session/verify', {
      method: 'POST',
      headers: {
        'x-api-key': 'invalid-key',
      },
      body: JSON.stringify({ userId: 'user1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Invalid API Key');
  });

  it('zwraca 400 gdy brakuje userId', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/session/verify', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({}), // brak userId
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing userId');
  });

  it('zwraca valid=false gdy użytkownik nie istnieje', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/session/verify', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({ userId: 'nonexistent-user', tokenVersion: 1 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe('user_not_found');
  });

  it('zwraca valid=false gdy tokenVersion nie pasuje (Kill Switch)', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user1',
      tokenVersion: 5, // Aktualna wersja tokenu
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/session/verify', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({ userId: 'user1', tokenVersion: 3 }), // Stara wersja
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe('token_version_mismatch');
  });

  it('zwraca valid=true gdy sesja jest poprawna', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user1',
      tokenVersion: 2,
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/session/verify', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({ userId: 'user1', tokenVersion: 2 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
  });

  it('domyślnie używa tokenVersion=1 gdy nie podano', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    // Użytkownik z domyślną wersją tokenu (1)
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user1',
      tokenVersion: 1,
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/session/verify', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({ userId: 'user1' }), // Bez tokenVersion
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
  });

  it('obsługuje użytkownika bez pola tokenVersion (null)', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    // Użytkownik bez tokenVersion (legacy)
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user1',
      tokenVersion: null,
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/session/verify', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({ userId: 'user1', tokenVersion: 1 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
  });
});
