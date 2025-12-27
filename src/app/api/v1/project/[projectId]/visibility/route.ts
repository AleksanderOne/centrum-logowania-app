import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logSuccess, logFailure } from '@/lib/security';

type Params = Promise<{ projectId: string }>;

/**
 * PATCH /api/v1/project/[projectId]/visibility
 * Zmienia widoczność projektu (publiczny/prywatny)
 * Body: { isPublic: boolean }
 */
export async function PATCH(req: NextRequest, segmentData: { params: Params }) {
  const params = await segmentData.params;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sprawdź czy użytkownik jest właścicielem projektu
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, params.projectId), eq(projects.ownerId, session.user.id)),
    });

    if (!project) {
      await logFailure('access_denied', {
        userId: session.user.id,
        projectId: params.projectId,
        metadata: { reason: 'not_owner', action: 'change_visibility' },
      });
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { isPublic } = body;

    if (typeof isPublic !== 'boolean') {
      return NextResponse.json({ error: 'isPublic must be a boolean' }, { status: 400 });
    }

    // Aktualizuj widoczność
    await db
      .update(projects)
      .set({
        isPublic: isPublic ? 'true' : 'false',
        updatedAt: new Date(),
      })
      .where(eq(projects.id, params.projectId));

    await logSuccess('project_access', {
      userId: session.user.id,
      projectId: params.projectId,
      metadata: { action: 'visibility_changed', isPublic },
    });

    return NextResponse.json({
      success: true,
      message: isPublic ? 'Projekt jest teraz publiczny' : 'Projekt jest teraz prywatny',
    });
  } catch (error) {
    console.error('Change project visibility error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
