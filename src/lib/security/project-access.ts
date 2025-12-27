/**
 * Project Access - Izolacja Danych
 *
 * Sprawdza czy użytkownik ma dostęp do danego projektu.
 * - Publiczne projekty (isPublic = 'true'): każdy może się logować
 * - Prywatne projekty (isPublic = 'false'): tylko użytkownicy z tabeli project_users
 */

import { db } from '@/lib/db/drizzle';
import { projects, projectUsers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export interface ProjectAccessResult {
  allowed: boolean;
  reason?: 'project_not_found' | 'project_private' | 'user_not_member';
  project?: {
    id: string;
    name: string;
    slug: string;
    isPublic: boolean;
  };
  memberRole?: string;
}

/**
 * Sprawdza czy użytkownik ma dostęp do projektu
 */
export async function checkProjectAccess(
  userId: string,
  projectId: string
): Promise<ProjectAccessResult> {
  // Pobierz projekt
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return { allowed: false, reason: 'project_not_found' };
  }

  const isPublic = project.isPublic === 'true';

  // Publiczny projekt - każdy ma dostęp
  if (isPublic) {
    return {
      allowed: true,
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        isPublic: true,
      },
    };
  }

  // Prywatny projekt - sprawdź członkostwo
  const membership = await db.query.projectUsers.findFirst({
    where: and(eq(projectUsers.userId, userId), eq(projectUsers.projectId, projectId)),
  });

  if (!membership) {
    return {
      allowed: false,
      reason: 'user_not_member',
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        isPublic: false,
      },
    };
  }

  return {
    allowed: true,
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      isPublic: false,
    },
    memberRole: membership.role || 'member',
  };
}

/**
 * Sprawdza czy użytkownik ma dostęp do projektu po slug
 */
export async function checkProjectAccessBySlug(
  userId: string,
  projectSlug: string
): Promise<ProjectAccessResult> {
  // Pobierz projekt po slug
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, projectSlug),
  });

  if (!project) {
    return { allowed: false, reason: 'project_not_found' };
  }

  return checkProjectAccess(userId, project.id);
}

/**
 * Dodaje użytkownika do projektu
 */
export async function addUserToProject(
  userId: string,
  projectId: string,
  role: 'member' | 'admin' = 'member'
): Promise<boolean> {
  try {
    // Sprawdź czy już istnieje
    const existing = await db.query.projectUsers.findFirst({
      where: and(eq(projectUsers.userId, userId), eq(projectUsers.projectId, projectId)),
    });

    if (existing) {
      // Aktualizuj rolę jeśli się zmieniła
      if (existing.role !== role) {
        await db.update(projectUsers).set({ role }).where(eq(projectUsers.id, existing.id));
      }
      return true;
    }

    // Dodaj nowego członka
    await db.insert(projectUsers).values({
      userId,
      projectId,
      role,
    });

    return true;
  } catch (error) {
    console.error('[ProjectAccess] Failed to add user to project:', error);
    return false;
  }
}

/**
 * Usuwa użytkownika z projektu
 */
export async function removeUserFromProject(userId: string, projectId: string): Promise<boolean> {
  try {
    await db
      .delete(projectUsers)
      .where(and(eq(projectUsers.userId, userId), eq(projectUsers.projectId, projectId)));

    return true;
  } catch (error) {
    console.error('[ProjectAccess] Failed to remove user from project:', error);
    return false;
  }
}

/**
 * Pobiera listę członków projektu
 */
export async function getProjectMembers(projectId: string) {
  return db.query.projectUsers.findMany({
    where: eq(projectUsers.projectId, projectId),
  });
}
