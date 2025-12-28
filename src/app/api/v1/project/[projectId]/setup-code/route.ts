import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects, projectSetupCodes } from '@/lib/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { logSuccess, logFailure } from '@/lib/security';
import crypto from 'crypto';
import { devLog } from '@/lib/utils';

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
  devLog(
    `\n[SETUP-CODE] 📥 POST /api/v1/project/${params.projectId}/setup-code - Generowanie nowego kodu`
  );

  try {
    const session = await auth();

    if (!session?.user?.id) {
      devLog(`[SETUP-CODE] ❌ Brak sesji użytkownika`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    devLog(`[SETUP-CODE] 👤 Użytkownik: ${session.user.email} (${session.user.id})`);

    // Sprawdź czy użytkownik jest właścicielem projektu
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, params.projectId), eq(projects.ownerId, session.user.id)),
    });

    if (!project) {
      devLog(
        `[SETUP-CODE] ⛔ Odmowa dostępu: Użytkownik nie jest właścicielem projektu ${params.projectId}`
      );
      await logFailure('access_denied', {
        userId: session.user.id,
        projectId: params.projectId,
        metadata: { reason: 'not_owner', action: 'generate_setup_code' },
      });
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }
    devLog(`[SETUP-CODE] ✅ Weryfikacja właściciela OK. Generowanie unikalnego kodu...`);

    // Generuj nowy kod
    const code = generateSetupCode();
    const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minuta (jednorazowe użycie)

    const [setupCode] = await db
      .insert(projectSetupCodes)
      .values({
        projectId: params.projectId,
        code,
        expiresAt,
      })
      .returning();

    await logSuccess('setup_code_generate', {
      userId: session.user.id,
      projectId: params.projectId,
      metadata: { codeId: setupCode.id },
    });

    devLog(
      `[SETUP-CODE] 💾 Zapisano kod w bazie: ${setupCode.code.substring(0, 15)}... (ID: ${setupCode.id})`
    );
    devLog(`[SETUP-CODE] 🕒 Wygasa: ${setupCode.expiresAt?.toLocaleString('pl-PL')}`);
    devLog(`[SETUP-CODE] 🚀 Sukces! Zwracam wygenerowany kod.\n`);

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
  devLog(
    `\n[SETUP-CODE] 📥 GET /api/v1/project/${params.projectId}/setup-code - Pobieranie listy kodów`
  );

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

    devLog(`[SETUP-CODE] ✅ Znaleziono ${activeCodes.length} aktywnych kodów.\n`);

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
