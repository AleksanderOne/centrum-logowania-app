import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';

// Mockowanie modułów - używamy vi.hoisted() żeby mock był dostępny w factory
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      projects: {
        findFirst: vi.fn(),
      },
      projectSetupCodes: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}));

vi.mock('@/lib/security', () => ({
  logSuccess: vi.fn(),
  logFailure: vi.fn(),
}));

import { db } from '@/lib/db/drizzle';

describe('POST /api/v1/project/[projectId]/setup-code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zwraca 401 gdy brak sesji', async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/v1/project/123/setup-code', {
      method: 'POST',
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('zwraca 403 gdy user nie jest właścicielem projektu', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });
    vi.mocked(db.query.projects.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/v1/project/123/setup-code', {
      method: 'POST',
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('access denied');
  });

  it('generuje kod w formacie setup_[hex]', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: '123',
      name: 'Test Project',
      ownerId: 'user-1',
      slug: 'test-project',
      domain: null,
      description: null,
      apiKey: 'cl_test',
      isPublic: 'true',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockSetupCode = {
      id: 'code-id',
      code: 'setup_1234567890abcdef1234567890abcdef',
      expiresAt: new Date(Date.now() + 60 * 1000), // 1 minuta
      createdAt: new Date(),
    };

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockSetupCode]),
      }),
    } as never);

    const req = new NextRequest('http://localhost:3000/api/v1/project/123/setup-code', {
      method: 'POST',
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.code).toMatch(/^setup_[a-f0-9]{32}$/);
    expect(data.id).toBe('code-id');
    expect(data.expiresAt).toBeDefined();
  });
});

describe('GET /api/v1/project/[projectId]/setup-code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zwraca 401 gdy brak sesji', async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/v1/project/123/setup-code', {
      method: 'GET',
    });

    const response = await GET(req, { params: Promise.resolve({ projectId: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('zwraca 403 gdy user nie jest właścicielem projektu', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });
    vi.mocked(db.query.projects.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/v1/project/123/setup-code', {
      method: 'GET',
    });

    const response = await GET(req, { params: Promise.resolve({ projectId: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('access denied');
  });

  it('zwraca listę aktywnych kodów', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });
    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: '123',
      name: 'Test Project',
      ownerId: 'user-1',
      slug: 'test-project',
      domain: null,
      description: null,
      apiKey: 'cl_test',
      isPublic: 'true',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockCodes = [
      {
        id: 'code-1',
        projectId: '123',
        code: 'setup_abc123',
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        usedAt: null,
        usedByIp: null,
        createdAt: new Date(),
      },
    ];

    vi.mocked(db.query.projectSetupCodes.findMany).mockResolvedValue(mockCodes);

    const req = new NextRequest('http://localhost:3000/api/v1/project/123/setup-code', {
      method: 'GET',
    });

    const response = await GET(req, { params: Promise.resolve({ projectId: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.codes).toHaveLength(1);
    expect(data.codes[0].code).toBe('setup_abc123');
  });
});
