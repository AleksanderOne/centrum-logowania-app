import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';

// Mockowane funkcje pg
const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn();
const mockEnd = vi.fn();

// Mock pg przed importem route
vi.mock('pg', () => {
  return {
    Pool: class MockPool {
      connect = mockConnect;
      end = mockEnd;
    },
  };
});

// Import po mocku
import { GET } from './route';

describe('API /api/health', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset env
    process.env = { ...originalEnv };

    // Domyślna konfiguracja - baza działa
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
    mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    mockEnd.mockResolvedValue(undefined);

    // Ustawiamy zmienne środowiskowe
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.AUTH_SECRET = 'test-auth-secret';
    process.env.NEXT_PUBLIC_APP_VERSION = '1.0.0';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('zwraca status operational gdy wszystko działa', async () => {
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('operational');
    expect(json.services.database.status).toBe('up');
    expect(json.services.auth.status).toBe('up');
    expect(json.version).toBe('1.0.0');
    expect(json.timestamp).toBeDefined();
  });

  it('zwraca status degraded gdy brakuje konfiguracji auth', async () => {
    // Usuwamy zmienne auth
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('degraded');
    expect(json.services.database.status).toBe('up');
    expect(json.services.auth.status).toBe('down');
  });

  it('zwraca status outage gdy baza danych nie działa', async () => {
    // Symulujemy błąd połączenia z bazą
    mockConnect.mockRejectedValue(new Error('Connection refused'));

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.status).toBe('outage');
    expect(json.services.database.status).toBe('down');
  });

  it('mierzy latencję bazy danych', async () => {
    const res = await GET();
    const json = await res.json();

    expect(json.services.database.latency).toBeDefined();
    expect(typeof json.services.database.latency).toBe('number');
  });

  it('akceptuje alternatywne nazwy zmiennych środowiskowych', async () => {
    // Usuwamy domyślne nazwy
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.AUTH_SECRET;

    // Używamy alternatywnych nazw
    process.env.AUTH_GOOGLE_ID = 'alt-client-id';
    process.env.AUTH_GOOGLE_SECRET = 'alt-client-secret';
    process.env.NEXTAUTH_SECRET = 'alt-auth-secret';

    const res = await GET();
    const json = await res.json();

    expect(json.status).toBe('operational');
    expect(json.services.auth.status).toBe('up');
  });

  it('ustawia nagłówek Cache-Control na no-store', async () => {
    const res = await GET();

    expect(res.headers.get('Cache-Control')).toBe('no-store, max-age=0');
  });

  it('zawiera timestamp w formacie ISO', async () => {
    const res = await GET();
    const json = await res.json();

    // Sprawdzamy czy timestamp jest poprawnym formatem ISO
    const date = new Date(json.timestamp);
    expect(date.toISOString()).toBe(json.timestamp);
  });
});
