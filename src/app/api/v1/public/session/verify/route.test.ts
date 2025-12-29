import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { verifySessionToken } from '@/lib/jwt';
import { checkProjectAccess } from '@/lib/security';

// Mockowanie modułów bazy danych
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      projectSessions: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      }),
    }),
  },
}));

// Mockowanie funkcji security
vi.mock('@/lib/security', () => ({
  checkProjectAccess: vi.fn().mockResolvedValue({ allowed: true }),
}));

// Mockowanie JWT
vi.mock('@/lib/jwt', () => ({
  verifySessionToken: vi.fn(),
}));

// Mockowanie debug-logger
vi.mock('@/lib/debug-logger', () => ({
  serverLog: vi.fn(),
}));

describe('API /api/v1/public/session/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zwraca 400 gdy brakuje tokenu', async () => {
    const req = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({}), // Brak tokenu
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe('missing_token');
  });

  it('zwraca invalid_token gdy podpis JWT jest nieprawidłowy', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid-jwt-token' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe('invalid_token');
  });

  it('zwraca invalid_token gdy payload JWT jest niekompletny', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({
      userId: 'user1',
      // Brak projectId
    } as Awaited<ReturnType<typeof verifySessionToken>>);

    const req = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'incomplete-jwt-token' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe('invalid_token');
  });

  it('zwraca access_denied gdy użytkownik nie ma dostępu do projektu', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({
      userId: 'user1',
      projectId: 'private-project',
      tokenVersion: 1,
    } as Awaited<ReturnType<typeof verifySessionToken>>);

    vi.mocked(checkProjectAccess).mockResolvedValue({
      allowed: false,
      reason: 'project_private',
    });

    const req = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-jwt-token' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe('access_denied');
  });

  it('zwraca user_not_found gdy użytkownik nie istnieje', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({
      userId: 'deleted-user',
      projectId: 'p1',
      tokenVersion: 1,
    } as Awaited<ReturnType<typeof verifySessionToken>>);

    vi.mocked(checkProjectAccess).mockResolvedValue({ allowed: true });
    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-jwt-token' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe('user_not_found');
  });

  it('zwraca token_version_mismatch gdy wersja tokena się nie zgadza (Kill Switch)', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({
      userId: 'user1',
      projectId: 'p1',
      tokenVersion: 1, // Stara wersja tokena
    } as Awaited<ReturnType<typeof verifySessionToken>>);

    vi.mocked(checkProjectAccess).mockResolvedValue({ allowed: true });
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      tokenVersion: 2, // Nowa wersja w bazie (user wylogował się globalnie)
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    const req = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'old-version-jwt-token' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe('token_version_mismatch');
  });

  it('zwraca valid=true gdy wszystko jest w porządku', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({
      userId: 'user1',
      projectId: 'p1',
      tokenVersion: 1,
    } as Awaited<ReturnType<typeof verifySessionToken>>);

    vi.mocked(checkProjectAccess).mockResolvedValue({ allowed: true });
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      tokenVersion: 1, // Wersja się zgadza
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    vi.mocked(db.query.projectSessions.findFirst).mockResolvedValue({
      id: 's1',
      lastSeenAt: new Date(),
    } as any);

    const req = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-jwt-token' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
  });

  it('zwraca valid=true gdy obie wersje tokena są undefined/0 (domyślne)', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({
      userId: 'user1',
      projectId: 'p1',
      tokenVersion: undefined, // Brak wersji w tokenie
    } as Awaited<ReturnType<typeof verifySessionToken>>);

    vi.mocked(checkProjectAccess).mockResolvedValue({ allowed: true });
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      tokenVersion: null, // Null w bazie
    } as Awaited<ReturnType<typeof db.query.users.findFirst>>);

    vi.mocked(db.query.projectSessions.findFirst).mockResolvedValue({
      id: 's1',
      lastSeenAt: new Date(),
    } as any);

    const req = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-jwt-token' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
  });

  it('zwraca 500 gdy wystąpi nieoczekiwany błąd', async () => {
    // Wyciszamy console.error dla tego testu, aby nie zaśmiecać terminala
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(verifySessionToken).mockRejectedValue(new Error('Unexpected JWT error'));

    const req = new NextRequest('http://localhost/api/v1/public/session/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'some-token' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.error).toBe('internal_error');

    consoleErrorSpy.mockRestore();
  });
});
