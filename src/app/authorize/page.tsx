import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";

// Ten page służy jako "bramka".
// Inne aplikacje kierują tu użytkownika: 
// http://localhost:3002/authorize?client_id=SLUG_PROJEKTU&redirect_uri=URL_POWROTU

export default async function AuthorizePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await auth();

    // 1. Sprawdź parametry wejściowe
    const params = await searchParams;
    const clientId = params.client_id as string; // slug projektu
    const redirectUri = params.redirect_uri as string;

    if (!session) {
        // Jeśli niezalogowany -> Middleware i tak by tu nie wpuścił (wymusił login),
        // ale dla pewności przekieruj na login z powrotem tutaj.
        const callbackUrl = encodeURIComponent(`/authorize?client_id=${clientId}&redirect_uri=${redirectUri}`);
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
    const isLocalhost = redirectUri.includes("localhost");
    if (!isLocalhost && project.domain && !redirectUri.startsWith(project.domain)) {
        return (
            <div className="flex h-screen items-center justify-center text-red-500">
                Błąd bezpieczeństwa: URL powrotu nie pasuje do domeny projektu.
            </div>
        )
    }

    // 3. Sukces - Odsyłamy użytkownika z tokenem sesji
    // UWAGA: W OAuth2 używa się tutaj "Code" a nie tokenu w URL, 
    // ale dla uproszczenia (Implicit Flow / Internal use) przekażemy ID użytkownika/Token.
    // Ponieważ session.sessionToken jest httpOnly, musimy wygenerować token JWE manualnie lub przekazać session ID.
    // Najprościej dla Twoich apek: Przekażmy user_id, a Twoja apka odpyta API /verify.
    // Ale API /verify wymaga TOKENU JWT.

    // Hack na potrzeby MVP: Przekazujemy ciasteczko sesyjne jako token w URL (niezalecane produkcyjnie, ale działa).
    // Lepsza opcja: Wygeneruj jednorazowy "code" w bazie, a Twoja apka wymieni go na token.

    // Zróbmy prostszy, autorski flow: Przekieruj z "?token=..."
    // Ponieważ mamy dostęp do ciasteczek, możemy pobrać token.
    // W Auth.js (NextAuth v5) token sesji to często JWE.

    // Pobieramy surowy token z sesji (wymaga modyfikacji auth.ts żeby go zwracał session? Nie, session object go nie ma).
    // Użyjemy auth() który zwraca session user.

    // ALTERNATYWA: Twoje API /verify przyjmuje teraz API_KEY + TOKEN.
    // Musimy dać klientowi ten TOKEN.

    // Spróbujmy odczytać ciasteczko authjs.session-token
    // (Wymaga importu cookies z next/headers)

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("authjs.session-token")?.value
        || cookieStore.get("__Secure-authjs.session-token")?.value;

    if (!sessionToken) {
        return <div>Błąd: Nie udało się pobrać tokenu sesji.</div>
    }

    const finalRedirectUrl = `${redirectUri}?token=${sessionToken}`;

    // Automatyczny redirect
    redirect(finalRedirectUrl);

    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Trwa logowanie do {project?.name}...</p>
        </div>
    );
}
