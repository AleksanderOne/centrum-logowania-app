'use server';

import * as z from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { CreateProjectSchema } from '@/schemas';
import { nanoid } from 'nanoid';
import { eq, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logSuccess } from '@/lib/security';

// Pomocnik do generowania sluga
const generateSlug = (name: string) => {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    nanoid(4)
  );
};

export const createProject = async (values: z.infer<typeof CreateProjectSchema>) => {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: 'Nie jesteś zalogowany!' };
  }

  const validatedFields = CreateProjectSchema.safeParse(values);

  if (!validatedFields.success) {
    // Zwróć pierwszy błąd walidacji
    const firstError = validatedFields.error.issues[0];
    return { error: firstError?.message || 'Nieprawidłowe dane wejściowe' };
  }

  const { name, domain } = validatedFields.data;
  const slug = generateSlug(name);
  const apiKey = `cl_${nanoid(32)}`; // cl = centrum logowania prefix

  try {
    const [newProject] = await db
      .insert(projects)
      .values({
        name,
        slug,
        domain,
        apiKey,
        ownerId: session.user.id,
      })
      .returning();

    // Loguj utworzenie projektu do audytu
    await logSuccess('project_create', {
      userId: session.user.id,
      projectId: newProject.id,
      metadata: { projectName: name, slug, domain },
    });

    // Wymuś odświeżenie cache'a dashboardu
    revalidatePath('/dashboard');

    return { success: 'Projekt utworzony pomyślnie!' };
  } catch (_error) {
    console.error('Project creation error:', _error);
    return { error: 'Coś poszło nie tak przy tworzeniu projektu.' };
  }
};

export const getUserProjects = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  try {
    const userProjects = await db.query.projects.findMany({
      where: eq(projects.ownerId, session.user.id),
      orderBy: [desc(projects.createdAt)],
    });

    return userProjects;
  } catch {
    return [];
  }
};

// Walidacja UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const deleteProject = async (projectId: string) => {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: 'Nieautoryzowany dostęp' };
  }

  // Walidacja projectId
  if (!projectId || !uuidRegex.test(projectId)) {
    return { error: 'Nieprawidłowy identyfikator projektu' };
  }

  try {
    // Usuwamy tylko jeśli ID projektu ORAZ ID właściciela się zgadzają
    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, session.user.id)))
      .returning();

    if (!result.length) {
      return { error: 'Nie znaleziono projektu lub brak uprawnień' };
    }

    // Loguj usunięcie projektu do audytu
    const deletedProject = result[0];
    await logSuccess('project_delete', {
      userId: session.user.id,
      projectId: projectId,
      metadata: { projectName: deletedProject.name, slug: deletedProject.slug },
    });

    // Wymuś odświeżenie cache'a dashboardu
    revalidatePath('/dashboard');

    return { success: 'Projekt usunięty' };
  } catch {
    return { error: 'Błąd usuwania projektu' };
  }
};
