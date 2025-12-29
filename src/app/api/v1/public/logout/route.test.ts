import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { checkRateLimit, logSuccess } from '@/lib/security';

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
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mockowanie funkcji security
vi.mock('@/lib/security', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 20,
    resetAt: new Date(),
  }),
  generateRateLimitKey: vi.fn().mockReturnValue('test-key'),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  logSuccess: vi.fn().mockResolvedValue(undefined),
  logFailure: vi.fn().mockResolvedValue(undefined),
  extractRequestInfo: vi.fn().mockReturnValue({ ipAddress: '127.0.0.1', userAgent: 'test' }),
}));

// Mockowanie debug-logger
vi.mock('@/lib/debug-logger', () => ({
  serverLog: vi.fn(),
}));

describe('API /api/v1/public/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 20,
      resetAt: new Date(),
    });
  });

  it('zwraca 429 gdy rate limit został przekroczony', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
      retryAfterMs: 30000,
    });

    const req = new NextRequest('http://localhost/api/v1/public/logout', {
      method: 'POST',
      body: JSON.stringify({ userId: 'u1', projectSlug: 'test-project' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
  });

  it('zwraca sukces gdy body jest puste (graceful degradation)', async () => {
    const req = new NextRequest('http://localhost/api/v1/public/logout', {
      method: 'POST',
      body: '', // Puste body
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('zwraca sukces gdy brakuje wymaganych parametrów (graceful degradation)', async () => {
    const req = new NextRequest('http://localhost/api/v1/public/logout', {
      method: 'POST',
      body: JSON.stringify({ userId: 'u1' }), // Brak projectSlug
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('zwraca sukces nawet gdy projekt nie istnieje (nie ujawnia informacji)', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/public/logout', {
      method: 'POST',
      body: JSON.stringify({ userId: 'u1', projectSlug: 'nonexistent-project' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('usuwa sesję i loguje sukces gdy dane są poprawne', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      slug: 'test-project',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'u1',
      email: 'test@example.com',
      name: 'Test User',
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/public/logout', {
      method: 'POST',
      body: JSON.stringify({ userId: 'u1', projectSlug: 'test-project' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Sprawdź czy wywołano usunięcie sesji
    expect(db.delete).toHaveBeenCalled();

    // Sprawdź czy zalogowano sukces
    expect(logSuccess).toHaveBeenCalledWith(
      'logout',
      expect.objectContaining({
        userId: 'u1',
        projectId: 'p1',
      })
    );
  });

  it('obsługuje logout dla nieznanego użytkownika (user może zostać usunięty)', async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'p1',
      slug: 'test-project',
      name: 'Test Project',
    } as Awaited<ReturnType<typeof db.query.projects.findFirst>>);

    // Użytkownik nie istnieje w bazie
    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/public/logout', {
      method: 'POST',
      body: JSON.stringify({ userId: 'deleted-user', projectSlug: 'test-project' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Sesja powinna być usunięta nawet jeśli user nie istnieje
    expect(db.delete).toHaveBeenCalled();
  });
});
