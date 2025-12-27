import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mockowanie modułów
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      projectSetupCodes: {
        findFirst: vi.fn(),
      },
      projects: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

vi.mock('@/lib/security', () => ({
  logSuccess: vi.fn(),
  logFailure: vi.fn(),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

import { db } from '@/lib/db/drizzle';

describe('POST /api/v1/projects/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zwraca 400 gdy brak setupCode', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/projects/claim', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Setup code is required');
  });

  it('zwraca 400 dla nieprawidłowego formatu kodu', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/projects/claim', {
      method: 'POST',
      body: JSON.stringify({ setupCode: 'invalid' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid setup code format');
  });

  it('zwraca 404 gdy kod nie istnieje', async () => {
    vi.mocked(db.query.projectSetupCodes.findFirst).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/v1/projects/claim', {
      method: 'POST',
      body: JSON.stringify({ setupCode: 'setup_1234567890abcdef' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Invalid or expired setup code');
  });

  it('zwraca 410 gdy kod został już użyty', async () => {
    vi.mocked(db.query.projectSetupCodes.findFirst).mockResolvedValue({
      id: 'code-1',
      projectId: 'project-1',
      code: 'setup_1234567890abcdef',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: new Date(), // Już użyty
      usedByIp: '192.168.1.1',
      createdAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/v1/projects/claim', {
      method: 'POST',
      body: JSON.stringify({ setupCode: 'setup_1234567890abcdef' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error).toBe('Setup code has already been used');
  });

  it('zwraca 410 gdy kod wygasł', async () => {
    vi.mocked(db.query.projectSetupCodes.findFirst).mockResolvedValue({
      id: 'code-1',
      projectId: 'project-1',
      code: 'setup_1234567890abcdef',
      expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Wygasł
      usedAt: null,
      usedByIp: null,
      createdAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/v1/projects/claim', {
      method: 'POST',
      body: JSON.stringify({ setupCode: 'setup_1234567890abcdef' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error).toBe('Setup code has expired');
  });

  it('zwraca konfigurację projektu dla prawidłowego kodu', async () => {
    vi.mocked(db.query.projectSetupCodes.findFirst).mockResolvedValue({
      id: 'code-1',
      projectId: 'project-1',
      code: 'setup_1234567890abcdef',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: null,
      usedByIp: null,
      createdAt: new Date(),
    });

    vi.mocked(db.query.projects.findFirst).mockResolvedValue({
      id: 'project-1',
      name: 'Test Project',
      slug: 'test-project',
      apiKey: 'cl_test123',
      domain: null,
      description: null,
      ownerId: 'user-1',
      isPublic: 'true',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/v1/projects/claim', {
      method: 'POST',
      body: JSON.stringify({ setupCode: 'setup_1234567890abcdef' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.apiKey).toBe('cl_test123');
    expect(data.slug).toBe('test-project');
    expect(data.projectName).toBe('Test Project');
    expect(data.projectId).toBe('project-1');
    expect(data.centerUrl).toBeDefined();
  });
});
