import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, projectSetupCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logSuccess, logFailure, getClientIp } from '@/lib/security';
import { devLog } from '@/lib/utils';
import { serverLog } from '@/lib/debug-logger';

/**
 * POST /api/v1/projects/claim
 * Używa setup code do pobrania konfiguracji projektu.
 *
 * TEN ENDPOINT NIE WYMAGA AUTENTYKACJI - sam setup code jest jednorazowym tokenem.
 *
 * Body: { setupCode: "setup_abc123..." }
 * Response: { apiKey, slug, centerUrl, projectName }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { setupCode } = body;
    devLog(`\n[CLAIM] 📥 POST / api / v1 / projects / claim - Próba pobrania konfiguracji`);
    devLog(`[CLAIM] 🔍 Kod: ${setupCode} `);
    serverLog('[CLAIM] Attempting to claim setup code', {
      setupCode: setupCode ? setupCode.substring(0, 15) + '...' : 'N/A',
    });

    if (!setupCode || typeof setupCode !== 'string') {
      serverLog('[CLAIM] Setup code is missing or invalid type', { setupCode });
      return NextResponse.json({ error: 'Setup code is required' }, { status: 400 });
    }

    // Walidacja formatu kodu
    if (!setupCode.startsWith('setup_') || setupCode.length < 10) {
      serverLog('[CLAIM] Invalid setup code format', {
        setupCode: setupCode.substring(0, 15) + '...',
      });
      return NextResponse.json({ error: 'Invalid setup code format' }, { status: 400 });
    }

    const now = new Date();

    // Znajdź kod w bazie
    const code = await db.query.projectSetupCodes.findFirst({
      where: eq(projectSetupCodes.code, setupCode),
    });

    if (!code) {
      await logFailure('setup_code', {
        metadata: {
          action: 'claim_failed',
          reason: 'code_not_found',
          providedCode: setupCode.substring(0, 15) + '...', // Loguj tylko początek kodu
        },
      });
      devLog(`[CLAIM] ❌ Nie znaleziono kodu lub błędny`);
      serverLog('[CLAIM] Setup code not found in DB', {
        setupCode: setupCode.substring(0, 15) + '...',
      });
      return NextResponse.json({ error: 'Invalid or expired setup code' }, { status: 404 });
    }

    // Sprawdź czy kod nie został już użyty
    if (code.usedAt) {
      await logFailure('setup_code', {
        projectId: code.projectId,
        metadata: { action: 'claim_failed', reason: 'already_used', codeId: code.id },
      });
      serverLog('[CLAIM] Setup code already used', { codeId: code.id, projectId: code.projectId });
      return NextResponse.json(
        { error: 'Setup code has already been used' },
        { status: 410 } // Gone
      );
    }

    // Sprawdź czy kod nie wygasł
    if (code.expiresAt && code.expiresAt < now) {
      await logFailure('setup_code', {
        projectId: code.projectId,
        metadata: { action: 'claim_failed', reason: 'expired', codeId: code.id },
      });
      serverLog('[CLAIM] Setup code expired', {
        codeId: code.id,
        projectId: code.projectId,
        expiresAt: code.expiresAt,
      });
      return NextResponse.json(
        { error: 'Setup code has expired' },
        { status: 410 } // Gone
      );
    }

    // Pobierz dane projektu
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, code.projectId),
    });

    if (!project) {
      devLog(`[CLAIM] ❌ Nie znaleziono projektu powiązanego z kodem`);
      serverLog('[CLAIM] Project not found for setup code', {
        codeId: code.id,
        projectId: code.projectId,
      });
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    devLog(`[CLAIM] ✅ Kod poprawny(Projekt: ${project.name})`);
    serverLog('[CLAIM] Setup code valid, project found', {
      codeId: code.id,
      projectId: project.id,
      projectName: project.name,
    });

    // Oznacz kod jako użyty
    const clientIp = getClientIp(req);
    await db
      .update(projectSetupCodes)
      .set({
        usedAt: now,
        usedByIp: clientIp,
      })
      .where(eq(projectSetupCodes.id, code.id));

    await logSuccess('setup_code_use', {
      projectId: code.projectId,
      metadata: {
        codeId: code.id,
        usedByIp: clientIp,
      },
    });

    // Zwróć konfigurację projektu
    // W trybie development, używaj origin z requestu, aby obsłużyć różne porty (np. demo apps)
    let centerUrl = process.env.NEXTAUTH_URL;
    if (!centerUrl || (process.env.NODE_ENV === 'development' && req.nextUrl.origin)) {
      centerUrl = req.nextUrl.origin;
    }

    devLog(`[CLAIM] 🔖 Oznaczam kod jako użyty(IP: ${clientIp})`);
    devLog(`[CLAIM] 🚀 Sukces! Zwracam konfigurację.\n`);

    return NextResponse.json({
      apiKey: project.apiKey,
      slug: project.slug,
      centerUrl,
      projectName: project.name,
      projectId: project.id,
    });
  } catch (error) {
    console.error('Claim setup code error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
