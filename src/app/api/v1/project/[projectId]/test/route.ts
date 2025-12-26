import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, projectSessions } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

interface TestResult {
  domain: {
    status: 'success' | 'error' | 'pending' | 'skipped';
    message: string;
    responseTime?: number;
  };
  sessions: {
    status: 'success' | 'warning' | 'info';
    message: string;
    count: number;
    lastActivity?: Date | null;
  };
  integration: {
    status: 'success' | 'warning' | 'error';
    message: string;
  };
}

/**
 * Test Project Integration Endpoint
 *
 * Testuje integrację projektu z centrum logowania.
 * Sprawdza: dostępność domeny, aktywne sesje, ostatnią aktywność.
 *
 * POST /api/v1/project/[projectId]/test
 *
 * Response:
 *   { "results": { domain, sessions, integration } }
 */
export async function POST(
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

    const results: TestResult = {
      domain: { status: 'pending', message: '' },
      sessions: { status: 'info', message: '', count: 0 },
      integration: { status: 'pending', message: '' },
    };

    // 3. Test domeny (jeśli ustawiona)
    if (project.domain) {
      try {
        const startTime = Date.now();
        const domainUrl = project.domain.startsWith('http')
          ? project.domain
          : `https://${project.domain}`;

        // Próba połączenia z domeną
        const response = await fetch(domainUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000), // 10 sekund timeout
        });

        const responseTime = Date.now() - startTime;

        if (response.ok) {
          results.domain = {
            status: 'success',
            message: `Strona odpowiada poprawnie (${response.status})`,
            responseTime,
          };
        } else {
          results.domain = {
            status: 'error',
            message: `Strona zwróciła błąd: ${response.status} ${response.statusText}`,
            responseTime,
          };
        }
      } catch (error) {
        results.domain = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Nie można połączyć się z domeną',
        };
      }
    } else {
      results.domain = {
        status: 'skipped',
        message: 'Domena nie została skonfigurowana',
      };
    }

    // 4. Sprawdzenie sesji
    const sessions = await db.query.projectSessions.findMany({
      where: eq(projectSessions.projectId, projectId),
      orderBy: [desc(projectSessions.lastSeenAt)],
    });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSessions = sessions.filter((s) => s.lastSeenAt && s.lastSeenAt >= weekAgo);

    if (sessions.length === 0) {
      results.sessions = {
        status: 'info',
        message: 'Brak zarejestrowanych sesji. Nikt jeszcze nie logował się przez SSO.',
        count: 0,
      };
    } else if (recentSessions.length > 0) {
      results.sessions = {
        status: 'success',
        message: `${recentSessions.length} aktywnych użytkowników w ostatnim tygodniu`,
        count: sessions.length,
        lastActivity: sessions[0]?.lastSeenAt,
      };
    } else {
      results.sessions = {
        status: 'warning',
        message: `${sessions.length} sesji łącznie, brak aktywności w ostatnim tygodniu`,
        count: sessions.length,
        lastActivity: sessions[0]?.lastSeenAt,
      };
    }

    // 5. Ogólna ocena integracji
    const hasApiKey = !!project.apiKey;
    const hasDomain = !!project.domain;
    const hasRecentActivity = recentSessions.length > 0;

    if (!hasApiKey) {
      results.integration = {
        status: 'error',
        message: 'Brak API Key - nie można zweryfikować integracji',
      };
    } else if (!hasDomain) {
      results.integration = {
        status: 'warning',
        message: 'Brak domeny - dodaj domenę dla pełnej weryfikacji',
      };
    } else if (hasRecentActivity) {
      results.integration = {
        status: 'success',
        message: 'Integracja działa poprawnie! Użytkownicy aktywnie się logują.',
      };
    } else if (sessions.length > 0) {
      results.integration = {
        status: 'warning',
        message: 'Integracja skonfigurowana, ale brak ostatniej aktywności',
      };
    } else {
      results.integration = {
        status: 'warning',
        message: 'Integracja skonfigurowana, ale jeszcze nikt się nie zalogował',
      };
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Test project integration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
