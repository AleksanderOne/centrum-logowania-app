# Security Implementation Guide

Szczegółowe instrukcje implementacji funkcji bezpieczeństwa dla Centrum Logowania.

---

## FAZA 1: Security Hardening

### 1.1 CORS i Secure Headers (`next.config.ts`)

**Status**: Do implementacji (obecnie CORS ma `*`)

Zastąp obecną konfigurację w `next.config.ts`:

```typescript
async headers() {
  // Pobierz dozwolone originy z env (rozdzielone przecinkami)
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  // Funkcja generująca nagłówki CORS w zależności od Origin
  const corsHeaders = (origin: string | null) => {
    const isAllowed = origin && allowedOrigins.includes(origin);
    const corsOrigin = isAllowed ? origin : (process.env.NEXTAUTH_URL || '*');

    return [
      { key: 'Access-Control-Allow-Origin', value: corsOrigin },
      { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-api-key' },
      { key: 'Access-Control-Allow-Credentials', value: 'true' },
    ];
  };

  const securityHeaders = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-XSS-Protection', value: '1; mode=block' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    {
      key: 'Content-Security-Policy',
      value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://accounts.google.com https://www.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    }
  ];

  return [
    { source: '/api/health', headers: corsHeaders(process.env.NEXTAUTH_URL || null) },
    { source: '/api/v1/projects/claim', headers: corsHeaders(process.env.NEXTAUTH_URL || null) },
    { source: '/api/v1/public/:path*', headers: corsHeaders(process.env.NEXTAUTH_URL || null) },
    { source: '/:path*', headers: securityHeaders },
  ];
}
```

**Wymagane ENV**:

```env
ALLOWED_ORIGINS=https://twoja-domena.com,https://app.klienta.com
```

---

### 1.2 CSRF Protection w Endpointach

**Status**: Moduł `lib/security/csrf.ts` istnieje, ale NIE jest używany w API routes

Dodaj `requireValidOrigin(req)` do następujących endpointów:

- `app/api/v1/token/route.ts`
- `app/api/v1/public/token/route.ts`
- `app/api/v1/projects/claim/route.ts`
- `app/api/v1/verify/route.ts`
- `app/api/v1/session/verify/route.ts`

**Przykład implementacji:**

```typescript
import { requireValidOrigin } from '@/lib/security';

export async function POST(req: NextRequest) {
  // Weryfikacja CSRF/Origin PRZED przetwarzaniem
  if (!requireValidOrigin(req)) {
    await logFailure('access_denied', {
      ipAddress,
      userAgent,
      metadata: { reason: 'invalid_origin', origin: req.headers.get('origin') },
    });
    return NextResponse.json({ error: 'Invalid Origin/Referer' }, { status: 403 });
  }

  // ... reszta kodu
}
```

**Uwaga**: Dla endpointów wywoływanych z innych serwerów (nie przeglądarki), można pominąć tę weryfikację lub użyć API key authentication.

---

### 1.3 Brute Force Detection w Endpointach

**Status**: Moduł `lib/security/brute-force-detector.ts` istnieje, ale NIE jest używany

Dodaj weryfikację brute force do:

- `app/api/v1/token/route.ts`
- `app/api/v1/public/token/route.ts`
- `app/api/v1/verify/route.ts`
- `app/api/v1/projects/claim/route.ts`

**Przykład implementacji:**

```typescript
import { checkBruteForceByIp } from '@/lib/security';

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);

  // Sprawdź brute force PRZED przetwarzaniem
  const bruteForceCheck = await checkBruteForceByIp(ipAddress, 'token_exchange');

  if (bruteForceCheck.isBruteForce) {
    await logFailure('rate_limited', {
      ipAddress,
      userAgent,
      metadata: {
        reason: 'brute_force_detected',
        attempts: bruteForceCheck.attempts,
      },
    });

    return NextResponse.json(
      {
        error: 'Too many failed attempts. Please try again later.',
        retryAfter: bruteForceCheck.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(bruteForceCheck.retryAfter || 900),
        },
      }
    );
  }

  // ... reszta kodu
}
```

---

### 1.4 Rate Limiting per User

**Status**: Do implementacji

Dodaj do `lib/security/rate-limiter.ts`:

```typescript
/**
 * Generuje klucz rate limit dla user + endpoint
 */
export function generateUserRateLimitKey(userId: string, endpoint: string): string {
  return `user:${userId}:${endpoint}`;
}

/**
 * Sprawdza rate limit dla użytkownika
 */
export async function checkUserRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = generateUserRateLimitKey(userId, endpoint);
  return checkRateLimit(key, config);
}
```

**Eksport w `lib/security/index.ts`:**

```typescript
export { generateUserRateLimitKey, checkUserRateLimit } from './rate-limiter';
```

**Użycie w endpointach:**

```typescript
import { checkUserRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  // ... po pobraniu authCode ...

  if (authCode?.userId) {
    const userRateLimit = await checkUserRateLimit(
      authCode.userId,
      'api/v1/token',
      { windowMs: 60 * 1000, maxRequests: 10 } // 10 req/min per user
    );

    if (!userRateLimit.allowed) {
      await logFailure('rate_limited', {
        userId: authCode.userId,
        ipAddress,
        userAgent,
        metadata: { endpoint: 'api/v1/token', type: 'user' },
      });
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(
              userRateLimit.retryAfterMs ? Math.ceil(userRateLimit.retryAfterMs / 1000) : 60
            ),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': userRateLimit.resetAt.toISOString(),
          },
        }
      );
    }
  }

  // ... reszta kodu
}
```

---

### 1.5 Rate Limiting dla Setup Codes

**Status**: Do implementacji

Dodaj restrykcyjne limity do `/api/v1/projects/claim`:

```typescript
import { checkRateLimit, generateRateLimitKey, getClientIp } from '@/lib/security';

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);

  // Bardzo restrykcyjne limity (brute force prevention)
  const rateLimitResult = await checkRateLimit(
    generateRateLimitKey(ipAddress, 'api/v1/projects/claim'),
    { windowMs: 60 * 1000, maxRequests: 5 } // Tylko 5 prób/min
  );

  if (!rateLimitResult.allowed) {
    await logFailure('rate_limited', {
      ipAddress,
      userAgent,
      metadata: { endpoint: 'api/v1/projects/claim' },
    });

    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.retryAfterMs || 60000) / 1000)),
        },
      }
    );
  }

  // ... reszta kodu
}
```

---

### 1.6 IP Whitelisting dla Projektów

**Status**: Do implementacji (moduł nie istnieje)

**1. Schema Update (`drizzle`):**

```sql
CREATE TABLE project_ip_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES project(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, ip_address)
);

CREATE INDEX idx_project_ip_whitelist_project ON project_ip_whitelist(project_id);
```

**2. Schema w `src/lib/db/schema.ts`:**

```typescript
export const projectIpWhitelist = mySchema.table(
  'project_ip_whitelist',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    ipAddress: text('ip_address').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [unique().on(table.projectId, table.ipAddress)]
);
```

**3. Moduł `lib/security/ip-whitelist.ts`:**

```typescript
import { db } from '@/lib/db/drizzle';
import { projectIpWhitelist } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function isIpInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }

  const [network, prefixLength] = cidr.split('/');
  const prefix = parseInt(prefixLength, 10);

  const ipToNum = (ipStr: string): number => {
    return ipStr.split('.').reduce((acc, octet) => acc * 256 + parseInt(octet, 10), 0);
  };

  const ipNum = ipToNum(ip);
  const networkNum = ipToNum(network);
  const mask = ~(0xffffffff >>> prefix);

  return (ipNum & mask) === (networkNum & mask);
}

export async function isIpWhitelisted(projectId: string, ipAddress: string): Promise<boolean> {
  const whitelist = await db.query.projectIpWhitelist.findMany({
    where: eq(projectIpWhitelist.projectId, projectId),
  });

  if (whitelist.length === 0) {
    return true; // Brak whitelist = wszystkie dozwolone
  }

  return whitelist.some((entry) => {
    if (entry.ipAddress.includes('/')) {
      return isIpInCidr(ipAddress, entry.ipAddress);
    }
    return entry.ipAddress === ipAddress;
  });
}

export async function addIpToWhitelist(
  projectId: string,
  ipAddress: string,
  description?: string
): Promise<boolean> {
  try {
    await db.insert(projectIpWhitelist).values({
      projectId,
      ipAddress,
      description,
    });
    return true;
  } catch (error) {
    console.error('[IPWhitelist] Failed to add IP:', error);
    return false;
  }
}

export async function removeIpFromWhitelist(
  projectId: string,
  ipEntryId: string
): Promise<boolean> {
  try {
    await db.delete(projectIpWhitelist).where(eq(projectIpWhitelist.id, ipEntryId));
    return true;
  } catch (error) {
    console.error('[IPWhitelist] Failed to remove IP:', error);
    return false;
  }
}
```

**4. Integracja w API endpoints:**

```typescript
import { isIpWhitelisted } from '@/lib/security';

export async function POST(req: NextRequest) {
  // ... po pobraniu projektu ...

  const ipAllowed = await isIpWhitelisted(project.id, ipAddress);

  if (!ipAllowed) {
    await logFailure('access_denied', {
      userId: user?.id,
      projectId: project.id,
      ipAddress,
      userAgent,
      metadata: { reason: 'ip_not_whitelisted' },
    });

    return NextResponse.json(
      { error: 'Access denied: IP address not whitelisted' },
      { status: 403 }
    );
  }

  // ... reszta kodu
}
```

---

### 1.7 Cron Job dla Audit Logs Cleanup

**Status**: Moduł `audit-retention.ts` istnieje, brak cron job

**1. Skrypt `scripts/cleanup-audit-logs.ts`:**

```typescript
import { cleanupOldAuditLogs } from '../src/lib/security';

const RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10);

async function main() {
  console.log(`[Cleanup] Usuwanie logów starszych niż ${RETENTION_DAYS} dni...`);
  const deletedCount = await cleanupOldAuditLogs(RETENTION_DAYS);
  console.log(`[Cleanup] Usunięto ${deletedCount} logów`);
  process.exit(0);
}

main().catch((error) => {
  console.error('[Cleanup] Błąd:', error);
  process.exit(1);
});
```

**2. Dodaj do `package.json`:**

```json
{
  "scripts": {
    "cleanup:audit-logs": "tsx scripts/cleanup-audit-logs.ts"
  }
}
```

**3. API Route dla Vercel Cron (`app/api/cron/cleanup-audit-logs/route.ts`):**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldAuditLogs } from '@/lib/security';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10);
  const deletedCount = await cleanupOldAuditLogs(RETENTION_DAYS);

  return NextResponse.json({
    success: true,
    deletedCount,
    retentionDays: RETENTION_DAYS,
  });
}
```

**4. Konfiguracja `vercel.json`:**

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-audit-logs",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

**5. Zmienne środowiskowe:**

```env
AUDIT_LOG_RETENTION_DAYS=90
CRON_SECRET=your-secret-here
```

---

## FAZA 2: 2FA (TOTP)

### 2.1 Backend & Baza Danych

**Instalacja:**

```bash
npm install otplib qrcode @types/qrcode
```

**Schema Changes (`src/lib/db/schema.ts`):**

```typescript
export const users = mySchema.table('user', {
  // ... existing ...
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: text('two_factor_secret'), // SZYFROWANE!
  twoFactorVerifiedAt: timestamp('two_factor_verified_at'),
  backupCodes: text('backup_codes').array(),
});
```

**Szyfrowanie (`lib/security/encryption.ts`):**

Implementacja AES-256-GCM do szyfrowania sekretów 2FA. Klucz w ENV.

### 2.2 API Endpoints

**`POST /api/v1/2fa/setup`:**

- Wymaga sesji
- Generuje sekret: `authenticator.generateSecret()`
- Generuje `otpauth://` URL
- Generuje QR Code: `qrcode.toDataURL()`

**`POST /api/v1/2fa/verify`:**

- Przyjmuje: `token` (6 cyfr)
- Weryfikuje: `authenticator.check(token, secret)`
- Jeśli OK -> `two_factor_enabled = true`
- Generuje 10 kodów zapasowych

### 2.3 Integracja z Logowaniem

W `lib/auth.ts` (NextAuth signIn callback):

1. Sprawdź czy user ma `two_factor_enabled`
2. Jeśli tak -> sesja ma flagę `2fa_pending: true`
3. Middleware blokuje wszystkie routy poza `/auth/2fa-challenge`

---

## FAZA 3: WebAuthn / Passkeys

### 3.1 Backend

**Instalacja:**

```bash
npm install @simplewebauthn/server @simplewebauthn/browser
```

**Schema (`src/lib/db/schema.ts`):**

```typescript
export const passkeys = mySchema.table('passkey', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  transports: text('transports'),
  lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 3.2 Implementacja Flow

**Rejestracja:**

- `POST /api/v1/webauthn/register/options`: `generateRegistrationOptions()`
- `POST /api/v1/webauthn/register/verify`: `verifyRegistrationResponse()`

**Logowanie:**

- `POST /api/v1/webauthn/login/options`: `generateAuthenticationOptions()`
- `POST /api/v1/webauthn/login/verify`: `verifyAuthenticationResponse()`

---

## Monitoring i Alerting

### Security Monitor

**Moduł `lib/security/security-monitor.ts`:**

```typescript
import { db } from '@/lib/db/drizzle';
import { auditLogs } from '@/lib/db/schema';
import { eq, and, gte, count, sql } from 'drizzle-orm';

export interface SecurityAlert {
  type: 'multiple_failed_logins' | 'unusual_api_activity' | 'suspicious_ip' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata: Record<string, unknown>;
}

export async function checkSecurityAnomalies(): Promise<SecurityAlert[]> {
  const alerts: SecurityAlert[] = [];
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const failedLogins = await db
    .select({
      userId: auditLogs.userId,
      count: count(),
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, 'login'),
        eq(auditLogs.status, 'failure'),
        gte(auditLogs.createdAt, last24h)
      )
    )
    .groupBy(auditLogs.userId)
    .having(sql`COUNT(*) > 10`);

  for (const login of failedLogins) {
    if (login.userId) {
      alerts.push({
        type: 'multiple_failed_logins',
        severity: 'high',
        message: `User ${login.userId} has ${login.count} failed attempts in 24h`,
        metadata: { userId: login.userId, count: login.count },
      });
    }
  }

  return alerts;
}

export async function sendSecurityAlert(alert: SecurityAlert): Promise<void> {
  console.error('[SECURITY ALERT]', alert);

  if (process.env.SECURITY_ALERT_WEBHOOK) {
    try {
      await fetch(process.env.SECURITY_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      console.error('[SecurityMonitor] Failed to send alert:', error);
    }
  }
}
```

**API Endpoint (`app/api/v1/admin/security-alerts/route.ts`):**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkSecurityAnomalies } from '@/lib/security';

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const alerts = await checkSecurityAnomalies();
  return NextResponse.json({ alerts });
}
```

---

_Ostatnia aktualizacja: 2025-12-30_
