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
  RATE_LIMIT_CONFIGS: {
    default: { windowMs: 60000, maxRequests: 100 },
    tokenExchange: { windowMs: 60000, maxRequests: 100 },
  },
}));

describe('API /api/v1/token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zwraca 401 gdy brakuje x-api-key', async () => {
    const req = new NextRequest('http://localhost/api/v1/token', {
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

    const req = new NextRequest('http://localhost/api/v1/token', {
      method: 'POST',
      headers: {
        'x-api-key': 'invalid-key',
      },
      body: JSON.stringify({ code: 'some-code' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Invalid API Key');
  });

  it('zwraca 400 gdy brakuje kodu autoryzacyjnego', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/token', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({}), // brak kodu
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing authorization code');
  });

  it('zwraca 401 gdy kod autoryzacyjny jest nieprawidłowy lub już użyty', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/token', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({ code: 'invalid-code' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Invalid or already used authorization code');
  });

  it('zwraca 401 gdy kod autoryzacyjny wygasł', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    // Kod wygasł (expiresAt w przeszłości)
    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue({
      id: 'auth1',
      code: 'expired-code',
      projectId: 'p1',
      userId: 'user1',
      expiresAt: new Date(Date.now() - 10000), // 10 sekund temu
      redirectUri: 'http://localhost:3001/callback',
      usedAt: null,
    } as Awaited<ReturnType<typeof db.query.authorizationCodes.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/token', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({ code: 'expired-code' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Authorization code expired');
  });

  it('zwraca 400 gdy redirect_uri nie pasuje', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue({
      id: 'auth1',
      code: 'valid-code',
      projectId: 'p1',
      userId: 'user1',
      expiresAt: new Date(Date.now() + 60000), // za minutę
      redirectUri: 'http://localhost:3001/callback',
      usedAt: null,
    } as Awaited<ReturnType<typeof db.query.authorizationCodes.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/token', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
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

  it('zwraca 404 gdy użytkownik nie istnieje', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue({
      id: 'auth1',
      code: 'valid-code',
      projectId: 'p1',
      userId: 'nonexistent-user',
      expiresAt: new Date(Date.now() + 60000),
      redirectUri: 'http://localhost:3001/callback',
      usedAt: null,
    } as Awaited<ReturnType<typeof db.query.authorizationCodes.findFirst>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/token', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({ code: 'valid-code' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('User not found');
  });

  it('zwraca dane użytkownika gdy kod jest poprawny (nowa sesja)', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue({
      id: 'auth1',
      code: 'valid-code',
      projectId: 'p1',
      userId: 'user1',
      expiresAt: new Date(Date.now() + 60000),
      redirectUri: 'http://localhost:3001/callback',
      usedAt: null,
    } as Awaited<ReturnType<typeof db.query.authorizationCodes.findFirst>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/avatar.jpg',
      role: 'user',
      tokenVersion: 1,
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    // Brak istniejącej sesji
    vi.mocked(db.query.projectSessions.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/token', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({ code: 'valid-code' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user).toBeDefined();
    expect(json.user.id).toBe('user1');
    expect(json.user.email).toBe('test@example.com');
    expect(json.user.name).toBe('Test User');
    expect(json.user.tokenVersion).toBe(1);
    expect(json.project).toBeDefined();
    expect(json.project.id).toBe('p1');
    expect(json.project.name).toBe('Test Project');
  });

  it('aktualizuje istniejącą sesję zamiast tworzyć nową', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      apiKey: 'valid-key',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    vi.mocked(db.query.authorizationCodes.findFirst).mockResolvedValue({
      id: 'auth1',
      code: 'valid-code',
      projectId: 'p1',
      userId: 'user1',
      expiresAt: new Date(Date.now() + 60000),
      redirectUri: 'http://localhost:3001/callback',
      usedAt: null,
    } as Awaited<ReturnType<typeof db.query.authorizationCodes.findFirst>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      role: 'user',
      tokenVersion: 1,
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    // Istniejąca sesja
    vi.mocked(db.query.projectSessions.findFirst).mockResolvedValue({
      id: 'session1',
      userId: 'user1',
      projectId: 'p1',
    } as Awaited<ReturnType<typeof db.query.projectSessions.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/token', {
      method: 'POST',
      headers: {
        'x-api-key': 'valid-key',
      },
      body: JSON.stringify({ code: 'valid-code' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    // Sprawdzamy że db.update został wywołany (aktualizacja sesji)
    expect(db.update).toHaveBeenCalled();
  });
});
