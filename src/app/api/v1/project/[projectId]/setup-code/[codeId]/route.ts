import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects, projectSetupCodes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logSuccess, logFailure } from '@/lib/security';
import { devLog } from '@/lib/utils';

type Params = Promise<{ projectId: string; codeId: string }>;

/**
 * DELETE /api/v1/project/[projectId]/setup-code/[codeId]
 * Usuwa (unieważnia) setup code
 */
export async function DELETE(req: NextRequest, segmentData: { params: Params }) {
  const params = await segmentData.params;
  devLog(
    `\n[SETUP-CODE] 📥 DELETE /api/v1/project/${params.projectId}/setup-code/${params.codeId} - Usuwanie kodu`
  );

  try {
    const session = await auth();

    if (!session?.user?.id) {
      devLog(`[SETUP-CODE] ❌ Brak sesji użytkownika`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sprawdź czy użytkownik jest właścicielem projektu
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, params.projectId), eq(projects.ownerId, session.user.id)),
    });

    if (!project) {
      devLog(`[SETUP-CODE] ⛔ Odmowa dostępu do projektu`);
      await logFailure('access_denied', {
        userId: session.user.id,
        projectId: params.projectId,
        metadata: { reason: 'not_owner', action: 'delete_setup_code' },
      });
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Sprawdź czy kod istnieje i należy do projektu
    const setupCode = await db.query.projectSetupCodes.findFirst({
      where: and(
        eq(projectSetupCodes.id, params.codeId),
        eq(projectSetupCodes.projectId, params.projectId)
      ),
    });

    if (!setupCode) {
      devLog(`[SETUP-CODE] ❌ Nie znaleziono kodu do usunięcia`);
      return NextResponse.json({ error: 'Setup code not found' }, { status: 404 });
    }
    devLog(`[SETUP-CODE] 🗑️ Usuwanie kodu: ${params.codeId}`);

    // Usuń kod
    await db.delete(projectSetupCodes).where(eq(projectSetupCodes.id, params.codeId));

    await logSuccess('setup_code_delete', {
      userId: session.user.id,
      projectId: params.projectId,
      metadata: { codeId: params.codeId },
    });

    devLog(`[SETUP-CODE] ✅ Kod usunięty pomyślnie.\n`);

    return NextResponse.json({
      success: true,
      message: 'Setup code został usunięty',
    });
  } catch (error) {
    console.error('Delete setup code error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
