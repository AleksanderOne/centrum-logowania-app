import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { auditLogs, projects } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

/**
 * Audit Logs Endpoint
 *
 * Pobiera logi audytu dla zalogowanego użytkownika (admin).
 * Opcjonalnie można filtrować po projectId.
 *
 * GET /api/v1/audit-logs?projectId=XXX&limit=50
 *
 * Response:
 *   { "logs": [...] }
 */
export async function GET(req: NextRequest) {
  try {
    // Weryfikacja sesji
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pobierz parametry
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // Jeśli podano projectId, sprawdź czy użytkownik jest właścicielem
    if (projectId) {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.ownerId, session.user.id)),
      });

      if (!project) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
      }

      // Pobierz logi dla projektu
      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.projectId, projectId),
        orderBy: [desc(auditLogs.createdAt)],
        limit,
      });

      return NextResponse.json({ logs });
    }

    // Pobierz projekty użytkownika
    const userProjects = await db.query.projects.findMany({
      where: eq(projects.ownerId, session.user.id),
      columns: { id: true },
    });

    const projectIds = userProjects.map((p) => p.id);

    // Pobierz logi dla wszystkich projektów użytkownika lub jego własne akcje
    const logs = await db.query.auditLogs.findMany({
      orderBy: [desc(auditLogs.createdAt)],
      limit,
    });

    // Filtruj logi - pokaż tylko te dotyczące projektów użytkownika lub jego własnych akcji
    const filteredLogs = logs.filter(
      (log) =>
        log.userId === session.user!.id || (log.projectId && projectIds.includes(log.projectId))
    );

    return NextResponse.json({ logs: filteredLogs });
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
