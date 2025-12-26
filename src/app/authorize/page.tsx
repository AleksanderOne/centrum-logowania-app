import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects, authorizationCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import crypto from 'crypto';

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
  const clientId = params.client_id as string; // slug projektu
  const redirectUri = params.redirect_uri as string;

  if (!session?.user?.id) {
    // Jeśli niezalogowany -> Middleware i tak by tu nie wpuścił (wymusił login),
    // ale dla pewności przekieruj na login z powrotem tutaj.
    const callbackUrl = encodeURIComponent(
      `/authorize?client_id=${clientId}&redirect_uri=${redirectUri}`
    );
    redirect(`/?callbackUrl=${callbackUrl}`);
  }

  if (!clientId || !redirectUri) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        Błąd: Brak parametrów client_id lub redirect_uri.
      </div>
    );
  }

  // 2. Znajdź projekt i zweryfikuj domenę
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, clientId),
  });

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        Błąd: Nieznany projekt (client_id).
      </div>
    );
  }

  // Weryfikacja bezpieczeństwa: Czy redirectUri pasuje do domeny projektu?
  // Dla localhost pozwalamy na wszystko (dev mode), na produkcji sprawdzamy.
  const isLocalhost = redirectUri.includes('localhost');
  if (!isLocalhost && project.domain && !redirectUri.startsWith(project.domain)) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        Błąd bezpieczeństwa: URL powrotu nie pasuje do domeny projektu.
      </div>
    );
  }

  // 3. Generujemy jednorazowy kod autoryzacyjny (OAuth2 Authorization Code)
  const authCode = crypto.randomBytes(32).toString('hex'); // 64 znaki hex
  // Obliczamy datę wygaśnięcia - w Server Component Date.now() jest bezpieczne
  const codeExpirationMs = 5 * 60 * 1000; // 5 minut
  // eslint-disable-next-line react-hooks/purity -- Server Component: Date.now() jest bezpieczne
  const expiresAt = new Date(Date.now() + codeExpirationMs); // Kod ważny 5 minut

  // Zapisujemy kod w bazie
  await db.insert(authorizationCodes).values({
    code: authCode,
    userId: session.user.id,
    projectId: project.id,
    redirectUri: redirectUri,
    expiresAt: expiresAt,
  });

  // 4. Przekierowujemy z kodem autoryzacyjnym
  const finalRedirectUrl = `${redirectUri}?code=${authCode}`;

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
