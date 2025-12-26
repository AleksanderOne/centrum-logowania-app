import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, projectSessions } from '@/lib/db/schema';
import { eq, and, desc, gt } from 'drizzle-orm';
import { auth } from '@/lib/auth';

/**
 * Get Project Sessions Endpoint
 *
 * Pobiera listę aktywnych sesji dla danego projektu.
 * Wymaga autoryzacji właściciela projektu.
 *
 * GET /api/v1/project/[projectId]/sessions
 *
 * Response (sukces):
 *   { "sessions": [...], "stats": { total, activeToday, activeThisWeek } }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // 1. Sprawdzenie sesji użytkownika
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // 2. Sprawdzenie czy projekt należy do użytkownika
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.ownerId, session.user.id)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 3. Pobranie sesji projektu
    const sessions = await db.query.projectSessions.findMany({
      where: eq(projectSessions.projectId, projectId),
      orderBy: [desc(projectSessions.lastSeenAt)],
    });

    // 4. Obliczenie statystyk
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeToday = sessions.filter((s) => s.lastSeenAt && s.lastSeenAt >= todayStart).length;

    const activeThisWeek = sessions.filter((s) => s.lastSeenAt && s.lastSeenAt >= weekAgo).length;

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        userEmail: s.userEmail,
        userName: s.userName,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        lastSeenAt: s.lastSeenAt,
        createdAt: s.createdAt,
      })),
      stats: {
        total: sessions.length,
        activeToday,
        activeThisWeek,
      },
    });
  } catch (error) {
    console.error('Get project sessions error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Delete Session Endpoint
 *
 * Usuwa sesję użytkownika z projektu (wylogowanie zdalne).
 *
 * DELETE /api/v1/project/[projectId]/sessions?sessionId=xxx
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Sprawdzenie czy projekt należy do użytkownika
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.ownerId, session.user.id)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Usunięcie sesji
    await db
      .delete(projectSessions)
      .where(and(eq(projectSessions.id, sessionId), eq(projectSessions.projectId, projectId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
