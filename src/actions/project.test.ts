import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProject, deleteProject, getUserProjects } from './project';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';

import { revalidatePath } from 'next/cache';
import { logSuccess } from '@/lib/security';

// Mockowanie zależności
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mockowanie bazy danych - definiujemy mocki poza, aby móc je modyfikować w testach
const mockReturning = vi.fn();
const mockWhere = vi.fn(() => ({ returning: mockReturning }));
const mockDelete = vi.fn((_args: any) => ({ where: mockWhere }));
const mockInsertReturning = vi.fn();
const mockValues = vi.fn((_args: any) => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn((_args: any) => ({ values: mockValues }));

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    insert: (args: any) => mockInsert(args),
    delete: (args: any) => mockDelete(args),
    query: {
      projects: {
        findMany: vi.fn(),
      },
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/security', () => ({
  logSuccess: vi.fn(),
}));

describe('Project Actions', () => {
  const mockUser = { id: 'user_123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    // Domyślne sukcesy dla DB
    mockInsertReturning.mockResolvedValue([{ id: 'proj_1', name: 'Test Project' }]);
    mockReturning.mockResolvedValue([
      { id: 'proj_1', name: 'Deleted Project', slug: 'deleted-slug' },
    ]);
  });

  describe('createProject', () => {
    it('powinien zwrócić błąd, gdy użytkownik nie jest zalogowany', async () => {
      (auth as any).mockResolvedValue(null);
      const result = await createProject({ name: 'Project', domain: 'test.com' });
      expect(result).toEqual({ error: 'Nie jesteś zalogowany!' });
    });

    it('powinien utworzyć projekt dla zalogowanego użytkownika', async () => {
      (auth as any).mockResolvedValue({ user: mockUser });
      const result = await createProject({ name: 'Nowy Projekt', domain: 'example.com' });

      expect(result).toEqual({ success: 'Projekt utworzony pomyślnie!' });
      expect(mockInsert).toHaveBeenCalled();
      expect(logSuccess).toHaveBeenCalledWith('project_create', expect.anything());
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('powinien walidować dane wejściowe (zod)', async () => {
      (auth as any).mockResolvedValue({ user: mockUser });
      // "A" jest za krótkie (min 2)
      const result = await createProject({ name: 'A', domain: 'invalid domain' });
      expect(result.error).toBeDefined();
    });
  });

  describe('getUserProjects', () => {
    it('powinien zwrócić pustą tablicę, gdy brak sesji', async () => {
      (auth as any).mockResolvedValue(null);
      const result = await getUserProjects();
      expect(result).toEqual([]);
    });

    it('powinien pobrać projekty dla zalogowanego użytkownika', async () => {
      (auth as any).mockResolvedValue({ user: mockUser });
      const mockProjects = [
        { id: '1', name: 'P1' },
        { id: '2', name: 'P2' },
      ];
      (db.query.projects.findMany as any).mockResolvedValue(mockProjects);

      const result = await getUserProjects();
      expect(result).toEqual(mockProjects);
      expect(db.query.projects.findMany).toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('powinien usunąć projekt, jeśli użytkownik jest właścicielem', async () => {
      (auth as any).mockResolvedValue({ user: mockUser });
      const result = await deleteProject('550e8400-e29b-41d4-a716-446655440000'); // Poprawny UUID

      expect(result).toEqual({ success: 'Projekt usunięty' });
      expect(mockDelete).toHaveBeenCalled();
      expect(logSuccess).toHaveBeenCalledWith('project_delete', expect.anything());
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('powinien zwrócić błąd przy nieprawidłowym UUID', async () => {
      (auth as any).mockResolvedValue({ user: mockUser });
      const result = await deleteProject('invalid-id');
      expect(result).toEqual({ error: 'Nieprawidłowy identyfikator projektu' });
    });

    it('powinien zwrócić błąd, gdy projekt nie zostanie znaleziony (brak uprawnień)', async () => {
      (auth as any).mockResolvedValue({ user: mockUser });
      // Symulujemy brak usuniętego rekordu (pusta tablica z returning)
      mockReturning.mockResolvedValue([]);

      const result = await deleteProject('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toEqual({ error: 'Nie znaleziono projektu lub brak uprawnień' });
    });
  });
});
