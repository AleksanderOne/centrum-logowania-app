import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Typ odpowiedzi health-check
export interface HealthStatus {
  status: 'operational' | 'degraded' | 'outage';
  timestamp: string;
  services: {
    database: {
      status: 'up' | 'down';
      latency?: number;
    };
    auth: {
      status: 'up' | 'down';
    };
  };
  version: string;
}

// Sprawdzanie połączenia z bazą danych
async function checkDatabase(): Promise<{ status: 'up' | 'down'; latency?: number }> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  const start = Date.now();

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();

    return {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch {
    await pool.end().catch(() => {});
    return { status: 'down' };
  }
}

// Sprawdzanie konfiguracji auth (Google OAuth)
function checkAuthConfig(): { status: 'up' | 'down' } {
  // Sprawdzamy obie możliwe nazwy zmiennych (AUTH_GOOGLE_* lub GOOGLE_CLIENT_*)
  const hasGoogleId = !!(process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID);
  const hasGoogleSecret = !!(process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET);
  const hasAuthSecret = !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);

  return {
    status: hasGoogleId && hasGoogleSecret && hasAuthSecret ? 'up' : 'down',
  };
}

// Określanie ogólnego statusu systemu
function determineOverallStatus(
  database: { status: 'up' | 'down' },
  auth: { status: 'up' | 'down' }
): 'operational' | 'degraded' | 'outage' {
  // Jeśli baza danych nie działa - awaria
  if (database.status === 'down') {
    return 'outage';
  }

  // Jeśli auth nie jest skonfigurowany - degradacja
  if (auth.status === 'down') {
    return 'degraded';
  }

  return 'operational';
}

export async function GET() {
  try {
    const [database, auth] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkAuthConfig()),
    ]);

    const status = determineOverallStatus(database, auth);

    const response: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database,
        auth,
      },
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
    };

    // Ustawiamy odpowiedni kod HTTP
    const httpStatus = status === 'outage' ? 503 : status === 'degraded' ? 200 : 200;

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'outage',
        timestamp: new Date().toISOString(),
        services: {
          database: { status: 'down' },
          auth: { status: 'down' },
        },
        version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
      } satisfies HealthStatus,
      { status: 503 }
    );
  }
}
