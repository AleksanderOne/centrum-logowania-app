import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkProjectAccess,
  checkProjectAccessBySlug,
  addUserToProject,
  removeUserFromProject,
  getProjectMembers,
} from './project-access';
import { db } from '@/lib/db/drizzle';

// Mockowanie modułu bazy danych
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      projects: {
        findFirst: vi.fn(),
      },
      projectUsers: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('Project Access System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkProjectAccess', () => {
    it('zwraca false gdy projekt nie istnieje', async () => {
      vi.mocked(db.query.projects.findFirst).mockResolvedValue(undefined);

      const result = await checkProjectAccess('u1', 'p1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('project_not_found');
    });

    it('zwraca true dla projektu publicznego', async () => {
      vi.mocked(db.query.projects.findFirst).mockResolvedValue({
        id: 'p1',
        name: 'Publiczny',
        slug: 'public',
        isPublic: 'true',
      } as any);

      const result = await checkProjectAccess('any-user', 'p1');

      expect(result.allowed).toBe(true);
      expect(result.project?.isPublic).toBe(true);
    });

    it('zwraca true dla członka projektu prywatnego', async () => {
      vi.mocked(db.query.projects.findFirst).mockResolvedValue({
        id: 'p1',
        name: 'Prywatny',
        slug: 'private',
        isPublic: 'false',
      } as any);

      vi.mocked(db.query.projectUsers.findFirst).mockResolvedValue({
        userId: 'u1',
        projectId: 'p1',
        role: 'admin',
      } as any);

      const result = await checkProjectAccess('u1', 'p1');

      expect(result.allowed).toBe(true);
      expect(result.memberRole).toBe('admin');
    });

    it('zwraca false gdy użytkownik nie jest członkiem projektu prywatnego', async () => {
      vi.mocked(db.query.projects.findFirst).mockResolvedValue({
        id: 'p1',
        name: 'Prywatny',
        slug: 'private',
        isPublic: 'false',
      } as any);

      vi.mocked(db.query.projectUsers.findFirst).mockResolvedValue(undefined);

      const result = await checkProjectAccess('intruder', 'p1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('user_not_member');
    });
  });

  describe('checkProjectAccessBySlug', () => {
    it('wyszukuje projekt po slug i sprawdza dostęp', async () => {
      vi.mocked(db.query.projects.findFirst).mockResolvedValue({
        id: 'p1',
        slug: 'test-slug',
        isPublic: 'true',
      } as any);

      const result = await checkProjectAccessBySlug('u1', 'test-slug');

      expect(result.allowed).toBe(true);
      expect(db.query.projects.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
        })
      );
    });

    it('zwraca false gdy slug nie istnieje', async () => {
      vi.mocked(db.query.projects.findFirst).mockResolvedValue(undefined);

      const result = await checkProjectAccessBySlug('u1', 'wrong-slug');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('project_not_found');
    });
  });

  describe('addUserToProject', () => {
    it('dodaje nowego użytkownika jeśli nie istnieje', async () => {
      vi.mocked(db.query.projectUsers.findFirst).mockResolvedValue(undefined);

      const success = await addUserToProject('u1', 'p1', 'member');

      expect(success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
    });

    it('aktualizuje rolę jeśli użytkownik już istnieje', async () => {
      vi.mocked(db.query.projectUsers.findFirst).mockResolvedValue({
        id: 'm1',
        userId: 'u1',
        projectId: 'p1',
        role: 'member',
      } as any);

      const success = await addUserToProject('u1', 'p1', 'admin');

      expect(success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it('nie robi nic jeśli rola jest taka sama', async () => {
      vi.mocked(db.query.projectUsers.findFirst).mockResolvedValue({
        id: 'm1',
        userId: 'u1',
        projectId: 'p1',
        role: 'member',
      } as any);

      await addUserToProject('u1', 'p1', 'member');

      expect(db.update).not.toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('zwraca false przy błędzie bazy', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(db.query.projectUsers.findFirst).mockRejectedValue(new Error('DB Error'));

      const success = await addUserToProject('u1', 'p1');

      expect(success).toBe(false);
      vi.restoreAllMocks();
    });
  });

  describe('removeUserFromProject', () => {
    it('usuwa użytkownika z projektu', async () => {
      const success = await removeUserFromProject('u1', 'p1');

      expect(success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });

    it('zwraca false przy błędzie bazy', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(db.delete).mockReturnValueOnce({
        where: vi.fn().mockRejectedValueOnce(new Error('Delete Error')),
      } as any);

      const success = await removeUserFromProject('u1', 'p1');

      expect(success).toBe(false);
      vi.restoreAllMocks();
    });
  });

  describe('getProjectMembers', () => {
    it('pobiera listę członków', async () => {
      const mockMembers = [{ userId: 'u1' }, { userId: 'u2' }];

      vi.mocked(db.query.projectUsers.findMany).mockResolvedValue(mockMembers as any);

      const members = await getProjectMembers('p1');

      expect(members).toHaveLength(2);
      expect(db.query.projectUsers.findMany).toHaveBeenCalled();
    });
  });
});
