import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { rotateApiKey, logFailure } from '@/lib/security';

/**
 * POST /api/v1/project/[projectId]/rotate-api-key
 *
 * Rotuje API key projektu (tylko właściciel).
 * Wymaga autoryzacji (sesja NextAuth).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Sprawdź czy użytkownik jest właścicielem projektu
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: { id: true, ownerId: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId !== session.user.id) {
      await logFailure('access_denied', {
        userId: session.user.id,
        projectId,
        metadata: { action: 'api_key_rotation', reason: 'not_owner' },
      });
      return NextResponse.json({ error: 'Only project owner can rotate API key' }, { status: 403 });
    }

    // Wykonaj rotację
    const result = await rotateApiKey(projectId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'API key rotated successfully',
      newApiKey: result.newApiKey,
      projectName: project.name,
      // Ważne: nowy klucz pokazujemy tylko raz!
      warning: 'Save this key now. It will not be shown again.',
    });
  } catch (error) {
    console.error('[API Key Rotation] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
