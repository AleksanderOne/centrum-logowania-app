/**
 * API Key Manager - Zarządzanie i rotacja kluczy API
 *
 * Pozwala na bezpieczną rotację kluczy API projektów.
 */

import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logSuccess } from './audit-logger';

/**
 * Generuje nowy API key z prefixem
 */
export function generateApiKey(): string {
  return `cl_${nanoid(32)}`; // cl = centrum logowania prefix
}

/**
 * Rotuje API key dla projektu
 *
 * @param projectId - ID projektu
 * @param rotatedByUserId - ID użytkownika wykonującego rotację
 * @returns Nowy API key
 */
export async function rotateApiKey(
  projectId: string,
  rotatedByUserId: string
): Promise<{ newApiKey: string; oldApiKeyPrefix: string }> {
  // 1. Pobierz aktualny klucz (dla logowania)
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { apiKey: true },
  });

  const oldKeyPrefix = project?.apiKey?.substring(0, 10) + '...' || 'unknown';

  // 2. Wygeneruj nowy klucz
  const newApiKey = generateApiKey();

  // 3. Zaktualizuj w bazie
  await db
    .update(projects)
    .set({
      apiKey: newApiKey,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  // 4. Zaloguj rotację
  await logSuccess('setup_code', {
    userId: rotatedByUserId,
    projectId,
    metadata: {
      action: 'api_key_rotation',
      oldKeyPrefix,
    },
  });

  return { newApiKey, oldApiKeyPrefix: oldKeyPrefix };
}

/**
 * Sprawdza czy API key jest ważny i zwraca projekt
 */
export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  project?: { id: string; name: string; slug: string };
}> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.apiKey, apiKey),
    columns: { id: true, name: true, slug: true },
  });

  if (!project) {
    return { valid: false };
  }

  return {
    valid: true,
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
    },
  };
}

/**
 * Regeneruje API key (alias dla rotateApiKey)
 */
export async function regenerateApiKey(projectId: string, userId: string): Promise<string> {
  const result = await rotateApiKey(projectId, userId);
  return result.newApiKey;
}
