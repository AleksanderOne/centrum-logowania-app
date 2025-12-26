'use server';

import * as z from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { CreateProjectSchema } from '@/schemas';
import { nanoid } from 'nanoid';
import { eq, desc, and } from 'drizzle-orm';

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
    const firstError = validatedFields.error.errors[0];
    return { error: firstError?.message || 'Nieprawidłowe dane wejściowe' };
  }

  const { name, domain } = validatedFields.data;
  const slug = generateSlug(name);
  const apiKey = `cl_${nanoid(32)}`; // cl = centrum logowania prefix

  try {
    await db.insert(projects).values({
      name,
      slug,
      domain,
      apiKey,
      ownerId: session.user.id,
    });

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

    return { success: 'Projekt usunięty' };
  } catch {
    return { error: 'Błąd usuwania projektu' };
  }
};
