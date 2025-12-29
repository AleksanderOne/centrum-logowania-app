import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects, authorizationCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import crypto from 'crypto';
import { checkProjectAccess, logSuccess, logFailure } from '@/lib/security';
import { headers } from 'next/headers';
import { devLog } from '@/lib/utils';

import { serverLog } from '@/lib/debug-logger';
import { ErrorCard } from './_components/error-card';

/**
 * OAuth2 Authorization Endpoint
 *
 * Inne aplikacje kierują tu użytkownika:
 * /authorize?client_id=SLUG_PROJEKTU&redirect_uri=URL_POWROTU
 *
 * Flow:
 * 1. Użytkownik jest zalogowany (middleware wymusza login)
 * 2. Weryfikujemy client_id i redirect_uri
 * 3. Generujemy jednorazowy kod autoryzacyjny
 * 4. Przekierowujemy do redirect_uri?code=AUTHORIZATION_CODE
 * 5. Aplikacja kliencka wymienia kod na dane użytkownika przez POST /api/v1/token
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  // 1. Sprawdź parametry wejściowe
  const params = await searchParams;
  const client_id = params.client_id as string; // slug projektu
  const redirect_uri = params.redirect_uri as string;

  if (!session?.user?.id) {
    devLog(`[AUTH] 🛑 Brak sesji podczas autoryzacji. Przekierowanie do logowania.`);
    // Jeśli niezalogowany -> Middleware i tak by tu nie wpuścił (wymusił login),
    // ale dla pewności przekieruj na login z powrotem tutaj.
    const callbackUrl = encodeURIComponent(
      `/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}`
    );
    redirect(`/?callbackUrl=${callbackUrl}`);
  }

  devLog(`[AUTHORIZE] 📥 Request: client_id=${client_id}, redirect_uri=${redirect_uri}`);
  serverLog('[AUTHORIZE] Request', { client_id, redirect_uri });

  // 1. Walidacja parametrów
  if (!client_id || !redirect_uri) {
    serverLog('[AUTHORIZE] Missing parameters');
    // Dla localhost pozwalamy wrócić do redirect_uri (jeśli podano)
    const isLocalhostRedirect = redirect_uri?.includes('localhost');
    return (
      <ErrorCard
        title="Błąd żądania"
        message="Brakuje wymaganych parametrów autoryzacji (client_id lub redirect_uri)."
        code={`client_id=${client_id || 'BRAK'}, redirect_uri=${redirect_uri || 'BRAK'}`}
        backUrl={isLocalhostRedirect && redirect_uri ? redirect_uri : undefined}
      />
    );
  }

  // 2. Znajdź projekt i zweryfikuj domenę
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, client_id),
  });

  const isLocalhost = redirect_uri.includes('localhost');

  if (!project) {
    devLog(`[AUTH] ❌ Nieznany projekt: ${client_id}`);
    serverLog('[AUTHORIZE] Unknown project', { client_id });
    return (
      <ErrorCard
        title="Projekt nieznany"
        message={`Nie znaleziono projektu o identyfikatorze "${client_id}". Sprawdź konfigurację aplikacji.`}
        code="INVALID_CLIENT_ID"
        backUrl={isLocalhost ? redirect_uri : undefined} // Dla localhost pozwalamy wrócić
      />
    );
  }

  // Weryfikacja bezpieczeństwa: Czy redirectUri pasuje do domeny projektu?
  // Dla localhost pozwalamy na wszystko (dev mode), na produkcji sprawdzamy.
  if (!isLocalhost && project.domain && !redirect_uri.startsWith(project.domain)) {
    devLog(`[AUTH] ❌ Błąd bezpieczeństwa redirect_uri: ${redirect_uri} vs ${project.domain}`);
    serverLog('[AUTHORIZE] Redirect URI mismatch', {
      client_id,
      redirect_uri,
      projectDomain: project.domain,
    });
    return (
      <ErrorCard
        title="Błąd bezpieczeństwa"
        message="Adres powrotu (Redirect URI) nie pasuje do domeny skonfigurowanej w projekcie."
        code={`Oczekiwano domeny: ${project.domain}`}
      />
    );
  }

  // 2.5. Sprawdzenie izolacji danych - czy użytkownik ma dostęp do projektu
  const headersList = await headers();
  const ipAddress =
    headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  const accessResult = await checkProjectAccess(session.user.id, project.id);

  if (!accessResult.allowed) {
    devLog(`[AUTHORIZE] ⛔ Brak dostępu dla użytkownika: ${session.user.email}`);
    serverLog('[AUTHORIZE] Access Denied for user', {
      userId: session.user.id,
      reason: accessResult.reason,
      projectId: project.id,
    });

    await logFailure('access_denied', {
      userId: session.user.id,
      projectId: project.id,
      ipAddress,
      userAgent,
      metadata: { reason: accessResult.reason, redirectUri: redirect_uri },
    });

    return (
      <ErrorCard
        title="Brak dostępu"
        message={`Nie masz uprawnień do logowania się w aplikacji ${project.name}. ${
          accessResult.reason === 'user_not_member'
            ? 'Ten projekt jest prywatny. Skontaktuj się z administratorem w celu uzyskania zaproszenia.'
            : ''
        }`}
        code="ACCESS_DENIED"
        backUrl={redirect_uri}
      />
    );
  }

  // 3. Generujemy jednorazowy kod autoryzacyjny (OAuth2 Authorization Code)
  const authCode = crypto.randomBytes(32).toString('hex'); // 64 znaki hex
  // Obliczamy datę wygaśnięcia - w Server Component Date.now() jest bezpieczne
  const codeExpirationMs = 2 * 60 * 1000; // 2 minuty (bezpieczniejsze niż 5)
  // eslint-disable-next-line react-hooks/purity -- Server Component: Date.now() jest bezpieczne
  const expiresAt = new Date(Date.now() + codeExpirationMs); // Kod ważny 2 minuty

  // Parametry PKCE z searchParams
  const code_challenge = params.code_challenge as string;
  const code_challenge_method = params.code_challenge_method as string;

  // Zapisujemy kod w bazie
  await db.insert(authorizationCodes).values({
    code: authCode,
    userId: session.user.id,
    projectId: project.id,
    redirectUri: redirect_uri,
    expiresAt: expiresAt,
    codeChallenge: code_challenge || null,
    codeChallengeMethod: code_challenge_method || null,
  });

  // Logowanie sukcesu autoryzacji SSO
  await logSuccess('sso_login', {
    userId: session.user.id,
    projectId: project.id,
    ipAddress,
    userAgent,
    metadata: {
      redirectUri: redirect_uri,
      projectName: project.name,
      userEmail: session.user.email,
    },
  });

  // 4. Przekierowujemy z kodem autoryzacyjnym
  const finalRedirectUrl = `${redirect_uri}?code=${authCode}`;

  devLog(
    `[AUTH] ✅ Autoryzacja pomyślna. Przekierowanie do: ${finalRedirectUrl.substring(0, 50)}...`
  );

  // Automatyczny redirect
  redirect(finalRedirectUrl);

  // Fallback UI (nie powinien się pokazać bo redirect jest natychmiastowy)
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p>Trwa logowanie do {project?.name}...</p>
    </div>
  );
}
