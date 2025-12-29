import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { checkRateLimit, checkProjectAccess } from '@/lib/security';

// Mockowanie modułów bazy danych
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      projects: {
        findFirst: vi.fn(),
      },
      authorizationCodes: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
      projectSessions: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
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
}));

// Mockowanie JWT
vi.mock('@/lib/jwt', () => ({
  signSessionToken: vi.fn().mockResolvedValue('mock-session-token'),
}));

// Mockowanie debug-logger
vi.mock('@/lib/debug-logger', () => ({
  serverLog: vi.fn(),
}));

describe('API /api/v1/public/token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Domyślnie rate limit przepuszcza
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
    });
    vi.mocked(checkProjectAccess).mockResolvedValue({ allowed: true });
  });

  it('zwraca 429 gdy rate limit został przekroczony', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
      retryAfterMs: 30000,
    });

    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({ code: 'test', redirect_uri: 'http://test.com' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
  });

  it('zwraca 400 gdy brakuje kodu lub redirect_uri', async () => {
    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({}), // Brak obu parametrów
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing authorization code or redirect_uri');
  });

  it('zwraca 400 gdy kod autoryzacyjny jest nieprawidłowy', async () => {
    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({ code: 'invalid-code', redirect_uri: 'http://test.com/callback' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_grant');
  });

  it('zwraca 400 gdy redirect_uri nie pasuje', async () => {
    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue({
      id: 'auth1',
      code: 'valid-code',
      projectId: 'p1',
      userId: 'user1',
      expiresAt: new Date(Date.now() + 60000),
      redirectUri: 'http://legitimate-site.com/callback',
      usedAt: null,
    } as Awaited<ReturnType<typeof db.query.authorizationCodes.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({
        code: 'valid-code',
        redirect_uri: 'http://malicious-site.com/steal',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Redirect URI mismatch');
  });

  it('zwraca 401 gdy kod autoryzacyjny wygasł', async () => {
    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue({
      id: 'auth1',
      code: 'expired-code',
      projectId: 'p1',
      userId: 'user1',
      expiresAt: new Date(Date.now() - 10000), // 10 sekund temu
      redirectUri: 'http://test.com/callback',
      usedAt: null,
    } as Awaited<ReturnType<typeof db.query.authorizationCodes.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({ code: 'expired-code', redirect_uri: 'http://test.com/callback' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Authorization code expired');
  });

  it('zwraca 404 gdy użytkownik nie istnieje', async () => {
    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue({
      id: 'auth1',
      code: 'valid-code',
      projectId: 'p1',
      userId: 'nonexistent-user',
      expiresAt: new Date(Date.now() + 60000),
      redirectUri: 'http://test.com/callback',
      usedAt: null,
    } as Awaited<ReturnType<typeof db.query.authorizationCodes.findFirst>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({ code: 'valid-code', redirect_uri: 'http://test.com/callback' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('User not found');
  });

  it('zwraca 403 gdy użytkownik nie ma dostępu do projektu', async () => {
    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue({
      id: 'auth1',
      code: 'valid-code',
      projectId: 'p1',
      userId: 'user1',
      expiresAt: new Date(Date.now() + 60000),
      redirectUri: 'http://test.com/callback',
      usedAt: null,
    } as Awaited<ReturnType<typeof db.query.authorizationCodes.findFirst>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      tokenVersion: 0,
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    vi.mocked(checkProjectAccess).mockResolvedValue({
      allowed: false,
      reason: 'project_private',
    });

    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({ code: 'valid-code', redirect_uri: 'http://test.com/callback' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Access denied');
  });

  it('zwraca dane użytkownika i sessionToken gdy wszystko jest poprawne (nowa sesja)', async () => {
    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue({
      id: 'auth1',
      code: 'valid-code',
      projectId: 'p1',
      userId: 'user1',
      expiresAt: new Date(Date.now() + 60000),
      redirectUri: 'http://test.com/callback',
      usedAt: null,
    } as Awaited<ReturnType<typeof db.query.authorizationCodes.findFirst>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/avatar.jpg',
      tokenVersion: 1,
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    // Brak istniejącej sesji
    vi.mocked(db.query.projectSessions.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({ code: 'valid-code', redirect_uri: 'http://test.com/callback' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    // Sprawdź strukturę odpowiedzi
    expect(json.user).toBeDefined();
    expect(json.user.id).toBe('user1');
    expect(json.user.email).toBe('test@example.com');
    expect(json.user.name).toBe('Test User');
    // WAŻNE: Publiczny endpoint NIE zwraca tokenVersion!
    expect(json.user.tokenVersion).toBeUndefined();

    expect(json.project).toBeDefined();
    expect(json.project.id).toBe('p1');
    expect(json.project.name).toBe('Test Project');

    expect(json.sessionToken).toBe('mock-session-token');
  });

  it('aktualizuje istniejącą sesję zamiast tworzyć nową', async () => {
    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue({
      id: 'auth1',
      code: 'valid-code',
      projectId: 'p1',
      userId: 'user1',
      expiresAt: new Date(Date.now() + 60000),
      redirectUri: 'http://test.com/callback',
      usedAt: null,
    } as Awaited<ReturnType<typeof db.query.authorizationCodes.findFirst>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      tokenVersion: 1,
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    // Istniejąca sesja
    vi.mocked(db.query.projectSessions.findFirst).mockResolvedValue({
      id: 'session1',
      userId: 'user1',
      projectId: 'p1',
    } as Awaited<ReturnType<typeof db.query.projectSessions.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/public/token', {
      method: 'POST',
      body: JSON.stringify({ code: 'valid-code', redirect_uri: 'http://test.com/callback' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    // Sprawdzamy że db.update został wywołany (aktualizacja sesji)
    expect(db.update).toHaveBeenCalled();
    // Sprawdzamy że db.insert NIE został wywołany
    expect(db.insert).not.toHaveBeenCalled();
  });
});
