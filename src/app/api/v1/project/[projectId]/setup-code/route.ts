import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects, projectSetupCodes } from '@/lib/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { logSuccess, logFailure } from '@/lib/security';
import crypto from 'crypto';

type Params = Promise<{ projectId: string }>;

/**
 * Generuje unikalny setup code
 * Format: setup_[32 znaki hex]
 */
function generateSetupCode(): string {
  return `setup_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * POST /api/v1/project/[projectId]/setup-code
 * Generuje nowy setup code dla projektu (tylko właściciel)
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
        metadata: { reason: 'not_owner', action: 'generate_setup_code' },
      });
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Generuj nowy kod
    const code = generateSetupCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const [setupCode] = await db
      .insert(projectSetupCodes)
      .values({
        projectId: params.projectId,
        code,
        expiresAt,
      })
      .returning();

    await logSuccess('setup_code', {
      userId: session.user.id,
      projectId: params.projectId,
      metadata: { action: 'generated', codeId: setupCode.id },
    });

    return NextResponse.json({
      id: setupCode.id,
      code: setupCode.code,
      expiresAt: setupCode.expiresAt?.toISOString(),
      createdAt: setupCode.createdAt?.toISOString(),
    });
  } catch (error) {
    console.error('Generate setup code error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/v1/project/[projectId]/setup-code
 * Pobiera listę aktywnych (nieużytych, niewygasłych) setup codes
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

    // Pobierz aktywne kody (nieużyte i niewygasłe)
    const now = new Date();
    const activeCodes = await db.query.projectSetupCodes.findMany({
      where: and(
        eq(projectSetupCodes.projectId, params.projectId),
        isNull(projectSetupCodes.usedAt),
        gt(projectSetupCodes.expiresAt, now)
      ),
      orderBy: (codes, { desc }) => [desc(codes.createdAt)],
    });

    return NextResponse.json({
      codes: activeCodes.map((code) => ({
        id: code.id,
        code: code.code,
        expiresAt: code.expiresAt?.toISOString(),
        createdAt: code.createdAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get setup codes error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
