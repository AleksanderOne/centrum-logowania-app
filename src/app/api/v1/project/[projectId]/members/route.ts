import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects, projectUsers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logSuccess, logFailure } from '@/lib/security';

type Params = Promise<{ projectId: string }>;

/**
 * GET /api/v1/project/[projectId]/members
 * Pobiera listę członków projektu
 */
export async function GET(req: NextRequest, segmentData: { params: Params }) {
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
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Pobierz członków projektu z danymi użytkownika
    const members = await db.query.projectUsers.findMany({
      where: eq(projectUsers.projectId, params.projectId),
    });

    // Pobierz dane użytkowników
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, member.userId),
          columns: { email: true, name: true },
        });

        return {
          id: member.id,
          userId: member.userId,
          role: member.role,
          createdAt: member.createdAt?.toISOString(),
          user: user || { email: 'Nieznany', name: null },
        };
      })
    );

    return NextResponse.json({ members: membersWithUsers });
  } catch (error) {
    console.error('Get project members error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/project/[projectId]/members
 * Dodaje członka do projektu
 * Body: { email: string, role?: string }
 */
export async function POST(req: NextRequest, segmentData: { params: Params }) {
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
        metadata: { reason: 'not_owner', action: 'add_member' },
      });
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { email, role = 'member' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Znajdź użytkownika po emailu
    const userToAdd = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!userToAdd) {
      return NextResponse.json(
        { error: 'Użytkownik o podanym emailu nie istnieje w systemie' },
        { status: 404 }
      );
    }

    // Sprawdź czy już jest członkiem
    const existingMember = await db.query.projectUsers.findFirst({
      where: and(
        eq(projectUsers.userId, userToAdd.id),
        eq(projectUsers.projectId, params.projectId)
      ),
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'Użytkownik jest już członkiem tego projektu' },
        { status: 400 }
      );
    }

    // Dodaj członka
    await db.insert(projectUsers).values({
      userId: userToAdd.id,
      projectId: params.projectId,
      role,
    });

    await logSuccess('member_add', {
      userId: userToAdd.id,
      projectId: params.projectId,
      metadata: { addedBy: session.user.id, role, email },
    });

    return NextResponse.json({ success: true, message: 'Członek został dodany' });
  } catch (error) {
    console.error('Add project member error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
