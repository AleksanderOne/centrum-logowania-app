import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects, projectUsers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logSuccess, logFailure } from '@/lib/security';

type Params = Promise<{ projectId: string; memberId: string }>;

/**
 * DELETE /api/v1/project/[projectId]/members/[memberId]
 * Usuwa członka z projektu
 */
export async function DELETE(req: NextRequest, segmentData: { params: Params }) {
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
        metadata: { reason: 'not_owner', action: 'remove_member' },
      });
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Pobierz członka do usunięcia
    const member = await db.query.projectUsers.findFirst({
      where: and(
        eq(projectUsers.id, params.memberId),
        eq(projectUsers.projectId, params.projectId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Usuń członka
    await db
      .delete(projectUsers)
      .where(
        and(eq(projectUsers.id, params.memberId), eq(projectUsers.projectId, params.projectId))
      );

    await logSuccess('project_access', {
      userId: member.userId,
      projectId: params.projectId,
      metadata: { action: 'member_removed', removedBy: session.user.id },
    });

    return NextResponse.json({ success: true, message: 'Członek został usunięty' });
  } catch (error) {
    console.error('Remove project member error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
