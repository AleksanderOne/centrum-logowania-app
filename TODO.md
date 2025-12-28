# 🛠️ Master Plan: Centrum Logowania (Identity Provider)

Dokument ten jest techniczną mapą drogową rozwoju aplikacji. Zawiera instrukcje "krok po kroku", fragmenty kodu oraz konfigurację niezbędną do wdrożenia kluczowych funkcji bezpieczeństwa i nowych metod uwierzytelniania.

## 📋 Priorytetyzacja Implementacji

### 🔴 Priorytet 1 (Krytyczne) - Do natychmiastowej implementacji

1. **CORS & Secure Headers** (1.1) - `next.config.ts`
2. **CSRF Protection** (1.2) - Integracja `requireValidOrigin()` w endpointach
3. **Redirect URI Validation** (1.3) - Użycie `validateRedirectUri()`
4. **API Key Rotation** (1.7) - Bezpieczeństwo kluczy

### 🟠 Priorytet 2 (Wysokie) - Do implementacji w ciągu tygodnia

5. **PKCE Support** (1.3) - Schema update + integracja
6. **Rate Limiting per User** (1.4) - Rozszerzenie istniejącego modułu
7. **Brute Force Detection** (1.4) - Integracja w endpointach
8. **Skrócenie TTL Code** (1.3) - 2 minuty zamiast 5
9. **Email Domain Whitelist** (1.5) - Opcjonalnie
10. **Idle Session Timeout** (1.6) - Schema update + integracja

### 🟡 Priorytet 3 (Średnie) - Do implementacji w ciągu miesiąca

11. **IP Whitelisting** (1.8) - Opcjonalnie, dla specyficznych przypadków
12. **Audit Logs Retention** (1.9) - Cron job + cleanup
13. **Security Monitoring** (1.10) - System alertów

### ✅ Moduły już gotowe (wymagają tylko integracji)

- ✅ `lib/security/csrf.ts` - CSRF protection
- ✅ `lib/security/redirect-uri.ts` - Redirect URI validation
- ✅ `lib/security/pkce.ts` - PKCE implementation
- ✅ `lib/security/brute-force-detector.ts` - Brute force detection

---

## 🚨 FAZA 1: Security Hardening (Priorytet Krytyczny)

> **Źródło**: Security Analysis & Implementation Guide
> **Cel**: Uszczelnienie aplikacji przed atakami XSS, CSRF, Injection oraz nieautoryzowanym dostępem.

### 1.1. Konfiguracja CORS i Headers (`next.config.ts`) (P1 - Critical)

- [ ] **Wdrożenie dynamicznego CORS i nagłówków bezpieczeństwa**
      Zastąp w `next.config.ts` sekcję headers poniższym kodem. Rozwiązuje to problem "Zbyt Permisywne CORS" i "Brak Secure Headers".

  ```typescript
  async headers() {
    // Pobierz dozwolone originy z env (rozdzielone przecinkami)
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    // Funkcja generująca nagłówki CORS w zależności od Origin
    const corsHeaders = (origin: string | null) => {
      const isAllowed = origin && allowedOrigins.includes(origin);
      const corsOrigin = isAllowed ? origin : (process.env.NEXTAUTH_URL || '*'); // Fallback do * tylko w ostateczności lub dev

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
      { key: 'X-Frame-Options', value: 'DENY' }, // Chroni przed Clickjackingiem
      { key: 'X-Content-Type-Options', value: 'nosniff' }, // Chroni przed MIME-sniffing
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // Content-Security-Policy (CSP) - Dostosuj connect-src do Google OAuth
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://accounts.google.com https://www.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      }
    ];

    return [
      { source: '/api/health', headers: corsHeaders(process.env.NEXTAUTH_URL || null) },
      // Specyficzne CORS dla claim (Setup Code)
      { source: '/api/v1/projects/claim', headers: corsHeaders(process.env.NEXTAUTH_URL || null) },
      { source: '/api/v1/public/:path*', headers: corsHeaders(process.env.NEXTAUTH_URL || null) },
      // Globalne nagłówki bezpieczeństwa
      { source: '/:path*', headers: securityHeaders },
    ];
  }
  ```

  **Wymagane ENV**: `ALLOWED_ORIGINS=https://twoja-domena.com,https://app.klienta.com`

### 1.2. Ochrona CSRF i Origin (P1 - Critical)

- [ ] **Stworzenie modułu `lib/security/csrf.ts`**

  ```typescript
  import { NextRequest } from 'next/server';

  export function requireValidOrigin(req: NextRequest): boolean {
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const nextAuthUrl = process.env.NEXTAUTH_URL;

    // 1. Jeśli brak obu nagłówków - podejrzane (chyba że server-to-server, ale tu chronimy API przeglądarkowe)
    if (!origin && !referer) return false;

    // 2. Sprawdź Origin
    if (origin) {
      return allowedOrigins.includes(origin) || origin === nextAuthUrl;
    }

    // 3. Sprawdź Referer (fallback)
    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        return allowedOrigins.includes(refererOrigin) || refererOrigin === nextAuthUrl;
      } catch {
        return false;
      }
    }

    return false;
  }
  ```

- [ ] **Wdrożenie w endpointach (API Routes)**
      ✅ **Moduł już stworzony**: `lib/security/csrf.ts` zawiera `requireValidOrigin()`

  Dodaj wywołanie `requireValidOrigin(req)` na początku funkcji `POST` w:
  - `app/api/v1/token/route.ts` `// Token Exchange`
  - `app/api/v1/public/token/route.ts` `// Public Token Exchange`
  - `app/api/v1/projects/claim/route.ts` `// Project Claim`
  - `app/api/v1/verify/route.ts` `// Token Verify`
  - `app/api/v1/session/verify/route.ts` `// Session Verify`

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

  **Uwaga**: Dla endpointów które mogą być wywoływane z innych serwerów (nie przeglądarki), można pominąć tę weryfikację lub użyć osobnego mechanizmu (API key authentication).

### 1.3. Ulepszona Walidacja OAuth i PKCE (P2 - High)

- [ ] **Wzmocnienie Redirect URI Validation**
      ✅ **Moduł już stworzony**: `lib/security/redirect-uri.ts` zawiera pełną walidację

  **Integracja w `app/authorize/page.tsx`:**

  ```typescript
  import { validateRedirectUri } from '@/lib/security';

  export default async function AuthorizePage({ searchParams }) {
    // ... existing code ...

    // Zastąp istniejącą walidację redirect_uri:
    const redirectValidation = validateRedirectUri(redirect_uri, project.domain || null);

    if (!redirectValidation.valid) {
      devLog(`[AUTH] ❌ Nieprawidłowy redirect_uri: ${redirectValidation.reason}`);

      await logFailure('access_denied', {
        userId: session.user.id,
        projectId: project.id,
        ipAddress,
        userAgent,
        metadata: {
          reason: 'invalid_redirect_uri',
          redirectUri: redirect_uri,
          validationReason: redirectValidation.reason,
        },
      });

      return (
        <ErrorCard
          title="Błąd bezpieczeństwa"
          message={`Nieprawidłowy adres przekierowania: ${redirectValidation.reason}`}
          code="INVALID_REDIRECT_URI"
        />
      );
    }

    // ... reszta kodu
  }
  ```

  **Integracja w `app/api/v1/token/route.ts` i `app/api/v1/public/token/route.ts`:**

  ```typescript
  import { validateRedirectUri } from '@/lib/security';

  export async function POST(req: NextRequest) {
    // ... existing code ...

    // Po pobraniu authCode, zweryfikuj redirect_uri (jeśli podano w body):
    if (redirect_uri) {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, authCode.projectId),
      });

      const redirectValidation = validateRedirectUri(redirect_uri, project?.domain || null);

      if (!redirectValidation.valid) {
        await logFailure('token_exchange', {
          projectId: project?.id,
          ipAddress,
          userAgent,
          metadata: {
            reason: 'invalid_redirect_uri',
            redirectUri: redirect_uri,
            validationReason: redirectValidation.reason,
          },
        });
        return NextResponse.json({ error: 'Invalid redirect URI' }, { status: 400 });
      }

      // Sprawdź czy redirect_uri pasuje do zapisanego w kodzie
      if (authCode.redirectUri !== redirect_uri) {
        return NextResponse.json({ error: 'Redirect URI mismatch' }, { status: 400 });
      }
    }

    // ... reszta kodu
  }
  ```

- [ ] **Implementacja PKCE (Proof Key for Code Exchange)**
      ✅ **Moduł już stworzony**: `lib/security/pkce.ts` zawiera pełną implementację PKCE

  **1. Schema Update (`drizzle`):**

  ```sql
  ALTER TABLE authorization_code ADD COLUMN code_challenge TEXT;
  ALTER TABLE authorization_code ADD COLUMN code_challenge_method TEXT; -- 'S256'
  CREATE INDEX idx_authorization_code_challenge ON authorization_code(code_challenge) WHERE code_challenge IS NOT NULL;
  ```

  **2. Aktualizacja schema w `src/lib/db/schema.ts`:**

  ```typescript
  export const authorizationCodes = mySchema.table('authorization_code', {
    // ... existing columns ...
    codeChallenge: text('code_challenge'), // NOWA KOLUMNA
    codeChallengeMethod: text('code_challenge_method'), // NOWA KOLUMNA - 'S256'
  });
  ```

  **3. Integracja w `app/authorize/page.tsx`:**

  ```typescript
  import { isValidCodeChallenge } from '@/lib/security';

  export default async function AuthorizePage({ searchParams }) {
    const params = await searchParams;
    const code_challenge = params.code_challenge as string;
    const code_challenge_method = params.code_challenge_method as string;

    // ... existing validation ...

    // Jeśli podano PKCE, zweryfikuj
    if (code_challenge) {
      if (code_challenge_method !== 'S256') {
        await logFailure('access_denied', {
          userId: session.user.id,
          projectId: project.id,
          ipAddress,
          userAgent,
          metadata: { reason: 'invalid_pkce_method', method: code_challenge_method },
        });

        return (
          <ErrorCard
            title="Błąd"
            message="Tylko metoda S256 jest wspierana dla PKCE"
            code="INVALID_PKCE_METHOD"
          />
        );
      }

      if (!isValidCodeChallenge(code_challenge)) {
        await logFailure('access_denied', {
          userId: session.user.id,
          projectId: project.id,
          ipAddress,
          userAgent,
          metadata: { reason: 'invalid_pkce_challenge_format' },
        });

        return (
          <ErrorCard
            title="Błąd"
            message="Nieprawidłowy format code_challenge"
            code="INVALID_PKCE_CHALLENGE"
          />
        );
      }
    }

    // Zapisując kod, zapisz też challenge:
    await db.insert(authorizationCodes).values({
      code: authCode,
      userId: session.user.id,
      projectId: project.id,
      redirectUri: redirect_uri,
      expiresAt: expiresAt,
      codeChallenge: code_challenge || null,
      codeChallengeMethod: code_challenge_method || null,
    });

    // ... reszta kodu
  }
  ```

  **4. Integracja w `app/api/v1/public/token/route.ts` i `app/api/v1/token/route.ts`:**

  ```typescript
  import { verifyPKCE, isValidCodeVerifier } from '@/lib/security';

  export async function POST(req: NextRequest) {
    const body = await req.json();
    const { code, redirect_uri, code_verifier } = body;

    // ... existing code ...

    // Po pobraniu authCode, zweryfikuj PKCE (jeśli był użyty):
    if (authCode.codeChallenge) {
      if (!code_verifier) {
        await logFailure('token_exchange', {
          ipAddress,
          userAgent,
          metadata: { reason: 'missing_code_verifier', endpoint: 'public' },
        });
        return NextResponse.json(
          { error: 'code_verifier is required when PKCE is used' },
          { status: 400 }
        );
      }

      if (!isValidCodeVerifier(code_verifier)) {
        await logFailure('token_exchange', {
          ipAddress,
          userAgent,
          metadata: { reason: 'invalid_code_verifier_format', endpoint: 'public' },
        });
        return NextResponse.json({ error: 'Invalid code_verifier format' }, { status: 400 });
      }

      if (!verifyPKCE(code_verifier, authCode.codeChallenge)) {
        await logFailure('token_exchange', {
          ipAddress,
          userAgent,
          metadata: { reason: 'pkce_verification_failed', endpoint: 'public' },
        });
        return NextResponse.json({ error: 'Invalid code_verifier' }, { status: 400 });
      }
    }

    // ... reszta kodu
  }
  ```

- [ ] **Skrócenie TTL Code**
      W `app/authorize/page.tsx` zmień czas wygaśnięcia kodu z `5 * 60 * 1000` na `2 * 60 * 1000` (2 minuty).

### 1.4. Rate Limiting i Anty-Abuse (P2 - High)

- [ ] **Rate Limiting per User**
      ✅ **Funkcjonalność**: Dodaj do `lib/security/rate-limiter.ts`:

  ```typescript
  // lib/security/rate-limiter.ts - dodaj do istniejącego pliku

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
  export {
    // ... existing exports ...
    generateUserRateLimitKey,
    checkUserRateLimit,
  } from './rate-limiter';
  ```

  **Użycie w endpointach:**

  ```typescript
  // app/api/v1/token/route.ts
  import { checkUserRateLimit, generateUserRateLimitKey } from '@/lib/security';

  export async function POST(req: NextRequest) {
    // ... existing IP-based rate limiting ...

    // DODATKOWO: Rate limiting per user (jeśli masz userId z authCode)
    if (authCode?.userId) {
      const userRateLimit = await checkUserRateLimit(
        authCode.userId,
        'api/v1/token',
        { windowMs: 60 * 1000, maxRequests: 10 } // 10 requestów na minutę per user
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

- [ ] **Implementacja Brute Force Detection**
      ✅ **Moduł już stworzony**: `lib/security/brute-force-detector.ts`

  **Wdrożenie w endpointach:**
  Dodaj weryfikację brute force na początku funkcji `POST` w:
  - `app/api/v1/token/route.ts`
  - `app/api/v1/public/token/route.ts`
  - `app/api/v1/verify/route.ts`

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
            'Retry-After': String(bruteForceCheck.retryAfter || 900), // 15 minut
          },
        }
      );
    }

    // ... reszta kodu
  }
  ```

- [ ] **Rate Limiting dla Setup Codes**
      Dodaj rate limiting do `/api/v1/projects/claim`:

  ```typescript
  // app/api/v1/projects/claim/route.ts
  import { checkRateLimit, generateRateLimitKey, getClientIp } from '@/lib/security';

  export async function POST(req: NextRequest) {
    const ipAddress = getClientIp(req);

    // Bardzo restrykcyjne limity dla setup codes (brute force prevention)
    const rateLimitResult = await checkRateLimit(
      generateRateLimitKey(ipAddress, 'api/v1/projects/claim'),
      { windowMs: 60 * 1000, maxRequests: 5 } // Tylko 5 prób na minutę
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

### 1.5. Email Domain Whitelist (P2 - High, Opcjonalnie)

- [ ] **Implementacja Email Domain Whitelist**
      **Cel**: Ograniczenie rejestracji tylko do dozwolonych domen email (np. domeny firmowe).

  **1. Utworzenie modułu `lib/security/email-whitelist.ts`:**

  ```typescript
  /**
   * Email Domain Whitelist - Ograniczenie rejestracji do dozwolonych domen
   */

  const ALLOWED_EMAIL_DOMAINS =
    process.env.ALLOWED_EMAIL_DOMAINS?.split(',').map((d) => d.trim()) || [];

  /**
   * Sprawdza czy domena email jest dozwolona
   * @param email - Email do weryfikacji
   * @returns true jeśli domena jest dozwolona lub brak whitelist (wszystkie dozwolone)
   */
  export function isEmailDomainAllowed(email: string): boolean {
    // Jeśli brak whitelist, wszystkie domeny są dozwolone
    if (ALLOWED_EMAIL_DOMAINS.length === 0) {
      return true;
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return false;
    }

    return ALLOWED_EMAIL_DOMAINS.includes(domain);
  }

  /**
   * Pobiera listę dozwolonych domen (do wyświetlenia użytkownikowi)
   */
  export function getAllowedEmailDomains(): string[] {
    return [...ALLOWED_EMAIL_DOMAINS];
  }
  ```

  **2. Eksport w `lib/security/index.ts`:**

  ```typescript
  export { isEmailDomainAllowed, getAllowedEmailDomains } from './email-whitelist';
  ```

  **3. Integracja w `lib/auth.ts` (NextAuth signIn callback):**

  ```typescript
  import { isEmailDomainAllowed } from '@/lib/security';

  async signIn({ user, account }) {
    if (account?.provider !== 'google') {
      return false;
    }

    if (!user.email) {
      await logFailure('login', {
        metadata: { reason: 'missing_email' },
      });
      return false;
    }

    // Sprawdź whitelist domen email
    if (!isEmailDomainAllowed(user.email)) {
      await logFailure('login', {
        metadata: {
          reason: 'email_domain_not_allowed',
          email: user.email,
          domain: user.email.split('@')[1],
        },
      });
      return false;
    }

    // ... reszta istniejącego kodu
  }
  ```

  **4. Zmienna środowiskowa w `.env`:**

  ```env
  # Opcjonalnie: Whitelist domen email (puste = wszystkie dozwolone)
  ALLOWED_EMAIL_DOMAINS=twoja-firma.com,partner.com,klient.pl
  ```

### 1.6. Idle Session Timeout (P2 - High)

- [ ] **Implementacja Idle Session Timeout**
      **Cel**: Automatyczne wygaszanie sesji po braku aktywności.

  **1. Schema Update (`drizzle`):**

  ```sql
  ALTER TABLE session ADD COLUMN last_activity TIMESTAMP DEFAULT NOW();
  CREATE INDEX idx_session_last_activity ON session(last_activity);
  ```

  **2. Aktualizacja `src/lib/db/schema.ts`:**

  ```typescript
  export const sessions = mySchema.table('session', {
    sessionToken: text('sessionToken').primaryKey(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
    lastActivity: timestamp('last_activity', { mode: 'date' }).defaultNow(), // NOWA KOLUMNA
  });
  ```

  **3. Aktualizacja `lib/auth.ts` (NextAuth JWT callback):**

  ```typescript
  async jwt({ token, user, trigger }) {
    if (user) {
      token.id = user.id;
    }

    // Weryfikacja idle timeout
    if (token.sub) {
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.userId, token.sub),
      });

      if (session?.lastActivity) {
        const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minut
        const timeSinceLastActivity = Date.now() - session.lastActivity.getTime();

        if (timeSinceLastActivity > IDLE_TIMEOUT_MS) {
          // Sesja wygasła przez brak aktywności
          await logFailure('session_timeout', {
            userId: token.sub,
            metadata: { reason: 'idle_timeout' },
          });
          return null; // Unieważnij token
        }

        // Aktualizuj lastActivity (tylko jeśli minęło > 5 minut od ostatniej aktualizacji, aby nie obciążać DB)
        const UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minut
        if (timeSinceLastActivity > UPDATE_INTERVAL_MS) {
          await db
            .update(sessions)
            .set({ lastActivity: new Date() })
            .where(eq(sessions.sessionToken, session.sessionToken));
        }
      }
    }

    return token;
  }
  ```

  **Uwaga**: Dla optymalizacji, można użyć `setInterval` lub cron job zamiast sprawdzania przy każdym requeście (lepsze dla wydajności).

### 1.7. API Key Rotation & Management (P1 - High)

- [ ] **Implementacja Rotacji API Keys**
      **Cel**: Możliwość rotacji API keys bez konieczności usuwania projektu.

  **1. Utworzenie modułu `lib/security/api-key-manager.ts`:**

  ```typescript
  /**
   * API Key Manager - Zarządzanie i rotacja API keys
   */
  import { db } from '@/lib/db/drizzle';
  import { projects } from '@/lib/db/schema';
  import { eq } from 'drizzle-orm';
  import { nanoid } from 'nanoid';
  import { logSuccess } from './audit-logger';

  /**
   * Generuje nowy API key
   */
  export function generateApiKey(): string {
    return `cl_${nanoid(32)}`; // cl = centrum logowania prefix
  }

  /**
   * Rotuje API key dla projektu
   * @param projectId - ID projektu
   * @param rotatedByUserId - ID użytkownika wykonującego rotację
   * @returns Nowy API key
   */
  export async function rotateApiKey(projectId: string, rotatedByUserId: string): Promise<string> {
    const newApiKey = generateApiKey();

    await db
      .update(projects)
      .set({
        apiKey: newApiKey,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // Loguj rotację do audytu
    await logSuccess('api_key_rotated', {
      userId: rotatedByUserId,
      projectId,
      metadata: { action: 'rotation' },
    });

    return newApiKey;
  }

  /**
   * Sprawdza czy API key jest ważny
   */
  export async function validateApiKey(apiKey: string): Promise<boolean> {
    const project = await db.query.projects.findFirst({
      where: eq(projects.apiKey, apiKey),
    });

    return !!project;
  }
  ```

  **2. Eksport w `lib/security/index.ts`:**

  ```typescript
  export { generateApiKey, rotateApiKey, validateApiKey } from './api-key-manager';
  ```

  **3. API Endpoint do rotacji (`app/api/v1/projects/[projectId]/rotate-api-key/route.ts`):**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { auth } from '@/lib/auth';
  import { db, projects } from '@/lib/db';
  import { eq } from 'drizzle-orm';
  import { rotateApiKey } from '@/lib/security';

  /**
   * POST /api/v1/projects/[projectId]/rotate-api-key
   * Rotuje API key projektu (tylko właściciel)
   */
  export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
  ) {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Sprawdź czy użytkownik jest właścicielem projektu
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rotuj API key
    const newApiKey = await rotateApiKey(projectId, session.user.id);

    return NextResponse.json({
      success: true,
      apiKey: newApiKey,
      message: 'API key rotated successfully',
    });
  }
  ```

  **4. Frontend - Dodaj przycisk rotacji w dashboardzie:**
  W komponencie zarządzania projektami dodaj przycisk "Rotuj API Key" z potwierdzeniem.

### 1.8. IP Whitelisting dla Projektów (P3 - Medium, Opcjonalnie)

- [ ] **Implementacja IP Whitelisting**
      **Cel**: Ograniczenie dostępu do projektu tylko z określonych IP (np. tylko z serwerów produkcyjnych).

  **1. Schema Update (`drizzle`):**

  ```sql
  CREATE TABLE project_ip_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES project(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL, -- Może być IP (192.168.1.1) lub CIDR (192.168.1.0/24)
    description TEXT, -- Opcjonalny opis (np. "Production Server")
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
    (table) => [
      unique().on(table.projectId, table.ipAddress), // UNIQUE constraint
    ]
  );
  ```

  **3. Utworzenie modułu `lib/security/ip-whitelist.ts`:**

  ```typescript
  /**
   * IP Whitelist - Weryfikacja dostępu do projektu po IP
   */
  import { db } from '@/lib/db/drizzle';
  import { projectIpWhitelist } from '@/lib/db/schema';
  import { eq } from 'drizzle-orm';

  /**
   * Sprawdza czy IP jest w CIDR range
   */
  function isIpInCidr(ip: string, cidr: string): boolean {
    // Prosta implementacja - dla produkcyjnej użyj biblioteki jak 'ipaddr.js'
    if (!cidr.includes('/')) {
      return ip === cidr; // Dokładne dopasowanie
    }

    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);

    // Konwersja IP do liczby (uproszczona dla IPv4)
    const ipToNum = (ipStr: string): number => {
      return ipStr.split('.').reduce((acc, octet) => acc * 256 + parseInt(octet, 10), 0);
    };

    const ipNum = ipToNum(ip);
    const networkNum = ipToNum(network);
    const mask = ~(0xffffffff >>> prefix);

    return (ipNum & mask) === (networkNum & mask);
  }

  /**
   * Sprawdza czy IP jest dozwolony dla projektu
   * @param projectId - ID projektu
   * @param ipAddress - IP do weryfikacji
   * @returns true jeśli IP jest dozwolony lub brak whitelist (wszystkie dozwolone)
   */
  export async function isIpWhitelisted(projectId: string, ipAddress: string): Promise<boolean> {
    const whitelist = await db.query.projectIpWhitelist.findMany({
      where: eq(projectIpWhitelist.projectId, projectId),
    });

    // Jeśli brak whitelist, wszystkie IP są dozwolone
    if (whitelist.length === 0) {
      return true;
    }

    // Sprawdź czy IP pasuje do któregokolwiek wpisu
    return whitelist.some((entry) => {
      if (entry.ipAddress.includes('/')) {
        return isIpInCidr(ipAddress, entry.ipAddress);
      }
      return entry.ipAddress === ipAddress;
    });
  }

  /**
   * Dodaje IP do whitelist projektu
   */
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

  /**
   * Usuwa IP z whitelist projektu
   */
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

  **4. Eksport w `lib/security/index.ts`:**

  ```typescript
  export { isIpWhitelisted, addIpToWhitelist, removeIpFromWhitelist } from './ip-whitelist';
  ```

  **5. Integracja w API endpoints:**
  W `app/api/v1/token/route.ts` (i innych wrażliwych endpointach):

  ```typescript
  import { isIpWhitelisted } from '@/lib/security';

  export async function POST(req: NextRequest) {
    // ... existing code ...

    // Sprawdź IP whitelist PRZED przetwarzaniem
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

### 1.9. Audit Logs Retention Policy (P3 - Medium)

- [ ] **Implementacja Retention Policy dla Audit Logs**
      **Cel**: Automatyczne usuwanie starych logów audytu (zgodność z RODO, oszczędność miejsca).

  **✅ Moduł już stworzony**: `lib/security/brute-force-detector.ts` zawiera funkcję `cleanupOldAuditLogs`

  **1. Utworzenie skryptu `scripts/cleanup-audit-logs.ts`:**

  ```typescript
  /**
   * Script do czyszczenia starych logów audytu
   * Uruchom przez cron job (np. raz w tygodniu)
   */
  import { cleanupOldAuditLogs } from '../src/lib/security';

  const RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10);

  async function main() {
    console.log(`[Cleanup] Usuwanie logów audytu starszych niż ${RETENTION_DAYS} dni...`);

    const deletedCount = await cleanupOldAuditLogs(RETENTION_DAYS);

    console.log(`[Cleanup] Usunięto ${deletedCount} starych logów`);
    process.exit(0);
  }

  main().catch((error) => {
    console.error('[Cleanup] Błąd:', error);
    process.exit(1);
  });
  ```

  **2. Dodaj script do `package.json`:**

  ```json
  {
    "scripts": {
      "cleanup:audit-logs": "tsx scripts/cleanup-audit-logs.ts"
    }
  }
  ```

  **3. Konfiguracja cron (np. Vercel Cron Jobs lub inny scheduler):**

  ```json
  // vercel.json (jeśli używasz Vercel)
  {
    "crons": [
      {
        "path": "/api/cron/cleanup-audit-logs",
        "schedule": "0 2 * * 0" // Co niedzielę o 2:00
      }
    ]
  }
  ```

  **Lub API Route (`app/api/cron/cleanup-audit-logs/route.ts`):**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { cleanupOldAuditLogs } from '@/lib/security';

  export async function GET(request: NextRequest) {
    // Weryfikacja cron secret (Vercel Cron)
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

  **4. Zmienna środowiskowa:**

  ```env
  AUDIT_LOG_RETENTION_DAYS=90  # Liczba dni przechowywania logów (domyślnie 90)
  CRON_SECRET=your-secret-here  # Secret dla cron job (Vercel)
  ```

---

## 🔒 FAZA 2: Dwuskładnikowe Uwierzytelnianie (2FA) - TOTP

> **Priorytet**: Wysoki (po Security Hardening)
> **Stack**: `otplib`, `qrcode`

### 2.1. Backend & Baza Danych (TOTP)

- [ ] **Instalacja zależności**
      `npm install otplib qrcode @types/qrcode`

- [ ] **Schema Changes (`src/lib/db/schema.ts`)**

  ```typescript
  export const users = mySchema.table('user', {
    // ... existing ...
    twoFactorEnabled: boolean('two_factor_enabled').default(false),
    twoFactorSecret: text('two_factor_secret'), // SZYFROWANE!
    twoFactorVerifiedAt: timestamp('two_factor_verified_at'),
    backupCodes: text('backup_codes').array(),
  });
  ```

- [ ] **Szyfrowanie (`lib/security/encryption.ts`)**
      Implementacja AES-256-GCM do szyfrowania sekretów 2FA przed zapisem do bazy. Klucz szyfrowania w ENV.

### 2.2. API Endpoints (2FA)

- [ ] **`POST /api/v1/2fa/setup`**
  - Wymaga sesji.
  - Generuje sekret: `authenticator.generateSecret()`.
  - Szyfruje sekret i zapisuje tymczasowo (lub zwraca w sesji, bez zapisu do potwierdzenia).
  - Generuje `otpauth://` URL.
  - Generuje QR Code (`qrcode.toDataURL()`).

- [ ] **`POST /api/v1/2fa/verify`**
  - Przyjmuje: `token` (6 cyfr).
  - Weryfikuje: `authenticator.check(token, secret)`.
  - Jeśli OK -> Ustawia `two_factor_enabled = true`.
  - Generuje kody zapasowe (10 losowych stringów).

### 2.3. Integracja z Logowaniem

- [ ] **Modyfikacja `auth.ts` (NextAuth)**
      W `signIn` callback:
  1. Sprawdź, czy user ma `two_factor_enabled`.
  2. Jeśli tak -> Zwróć błąd lub przekieruj (zależnie od strategii) lub...
  3. Lepiej: Użyj **Partial Entra** pattern (zaloguj, ale sesja ma flagę `2fa_pending: true`).
  4. Middleware: Jeśli sesja ma `2fa_pending`, blokuj wszystkie routy poza `/auth/2fa-challenge`.

---

## 🔑 FAZA 3: WebAuthn / Passkeys

> **Priorytet**: Średni
> **Stack**: `@simplewebauthn/server`, `@simplewebauthn/browser`

### 3.1. Backend (WebAuthn)

- [ ] **Instalacja**: `npm install @simplewebauthn/server @simplewebauthn/browser`

- [ ] **Schema (`src/lib/db/schema.ts`)**
  ```typescript
  export const passkeys = mySchema.table('passkey', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').notNull().unique(), // Base64URL
    publicKey: text('public_key').notNull(), // Base64URL
    counter: integer('counter').notNull().default(0),
    transports: text('transports'), // JSON array: ["usb", "nfc"]
    lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
    createdAt: timestamp('created_at').defaultNow(),
  });
  ```

### 3.2. Implementacja Flow

- [ ] **Rejestracja**
  - `POST /api/v1/webauthn/register/options`: `generateRegistrationOptions()`
  - `POST /api/v1/webauthn/register/verify`: `verifyRegistrationResponse()`

- [ ] **Logowanie**
  - `POST /api/v1/webauthn/login/options`: `generateAuthenticationOptions()`
  - `POST /api/v1/webauthn/login/verify`: `verifyAuthenticationResponse()`
  - Po sukcesie: Utwórz sesję NextAuth (Manualne tworzenie JWT/Session token).

---

---

## 🛡️ FAZA 1.10: Monitoring i Alerting (P3 - Medium, Opcjonalnie)

- [ ] **Implementacja Systemu Monitoringu i Alertów**
      **Cel**: Automatyczne wykrywanie i powiadamianie o podejrzanej aktywności.

  **1. Utworzenie modułu `lib/security/security-monitor.ts`:**

  ```typescript
  /**
   * Security Monitor - Wykrywanie anomalii i alerty
   */
  import { db } from '@/lib/db/drizzle';
  import { auditLogs } from '@/lib/db/schema';
  import { eq, and, gte, count, sql } from 'drizzle-orm';

  export interface SecurityAlert {
    type:
      | 'multiple_failed_logins'
      | 'unusual_api_activity'
      | 'suspicious_ip'
      | 'rate_limit_exceeded';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    metadata: Record<string, unknown>;
  }

  /**
   * Sprawdza czy występują anomalie bezpieczeństwa
   */
  export async function checkSecurityAnomalies(): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Wiele nieudanych logowań z różnych IP (możliwe brute force)
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
      .having(sql`COUNT(*) > 10`); // Więcej niż 10 nieudanych prób w 24h

    for (const login of failedLogins) {
      if (login.userId) {
        alerts.push({
          type: 'multiple_failed_logins',
          severity: 'high',
          message: `User ${login.userId} has ${login.count} failed login attempts in last 24h`,
          metadata: { userId: login.userId, count: login.count },
        });
      }
    }

    // 2. Niezwykła aktywność API (wiele requestów z tego samego API key)
    // TODO: Implementacja

    return alerts;
  }

  /**
   * Wysyła alert (email, Slack, etc.)
   */
  export async function sendSecurityAlert(alert: SecurityAlert): Promise<void> {
    // Implementacja wysyłki alertu (email, webhook, etc.)
    console.error('[SECURITY ALERT]', alert);

    // Przykład: Wysyłka przez webhook
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

  **2. API Endpoint do monitoringu (`app/api/v1/admin/security-alerts/route.ts`):**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { auth } from '@/lib/auth';
  import { checkSecurityAnomalies } from '@/lib/security';

  /**
   * GET /api/v1/admin/security-alerts
   * Pobiera alerty bezpieczeństwa (tylko admin)
   */
  export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const alerts = await checkSecurityAnomalies();

    return NextResponse.json({ alerts });
  }
  ```

  **3. Cron job do okresowego sprawdzania (opcjonalnie):**
  Uruchamiaj `checkSecurityAnomalies()` co godzinę i wysyłaj alerty.

---

## ✅ Checkpoint (Co mamy zrobione)

### ✅ Zaimplementowane Moduły Bezpieczeństwa

- [x] **CSRF Protection**: Moduł `lib/security/csrf.ts` z `requireValidOrigin()`
- [x] **Redirect URI Validation**: Moduł `lib/security/redirect-uri.ts` z pełną walidacją
- [x] **PKCE Support**: Moduł `lib/security/pkce.ts` z generowaniem i weryfikacją
- [x] **Brute Force Detection**: Moduł `lib/security/brute-force-detector.ts` z `checkBruteForceByIp()`
- [x] **Rate Limiting**: `lib/security/rate-limiter.ts` - limity per IP
- [x] **Audit Logging**: `lib/security/audit-logger.ts` - pełne logowanie zdarzeń
- [x] **Project Access Control**: `lib/security/project-access.ts` - izolacja danych

### ✅ Funkcjonalności

- [x] **Setup Code (Quick Connect)**: Backend (Tabela, API Claim/Gen) + Frontend (Manager, Wizard).
- [x] **Logging System**: Audit logs, plikowe logi (`logi.txt`), server-side logging helper.
- [x] **Core Auth**: Google OAuth, Drizzle Adapter, podstawowe sesje.
- [x] **Rate Limiting**: Proste limity per IP.
- [x] **Kill Switch**: Token versioning dla unieważniania sesji.

### ⚠️ Do Wdrożenia (Instrukcje powyżej)

- [ ] **CORS & Secure Headers**: Konfiguracja w `next.config.ts` (punkt 1.1)
- [ ] **CSRF w endpointach**: Dodanie `requireValidOrigin()` do API routes (punkt 1.2)
- [ ] **PKCE w authorize/token**: Integracja w flow OAuth (punkt 1.3)
- [ ] **Rate Limiting per User**: Rozszerzenie rate-limiter (punkt 1.4)
- [ ] **Brute Force w endpointach**: Dodanie weryfikacji (punkt 1.4)
- [ ] **Email Domain Whitelist**: Opcjonalne ograniczenie rejestracji (punkt 1.5)
- [ ] **Idle Session Timeout**: Automatyczne wygaszanie sesji (punkt 1.6)
- [ ] **API Key Rotation**: Rotacja i zarządzanie kluczami (punkt 1.7)
- [ ] **IP Whitelisting**: Opcjonalne ograniczenie dostępu (punkt 1.8)
- [ ] **Audit Logs Retention**: Automatyczne czyszczenie (punkt 1.9)
- [ ] **Security Monitoring**: Wykrywanie anomalii (punkt 1.10)
