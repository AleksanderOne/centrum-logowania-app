import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LogoutButtons,
  LogoutCurrentDevice,
  LogoutAllDevices,
} from '@/components/dashboard/logout-buttons';
import { ThemeCard } from '@/components/dashboard/theme-card';
import { ThemeToggleMini } from '@/components/dashboard/theme-toggle-mini';
import { UserIdSection } from '@/components/dashboard/user-id-section';

export default async function UserProfilePage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 pt-4 sm:pt-6">
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Profil Użytkownika</h2>
          <p className="text-muted-foreground">Zarządzaj swoim kontem i sesjami logowania.</p>
        </div>

        {/* ============================================= */}
        {/* UKŁAD DLA MOBILE I TABLET (< lg) */}
        {/* ============================================= */}
        <div className="lg:hidden space-y-4 sm:space-y-6">
          {/* Karta profilu z mini motywem i przyciskiem wylogowania */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 sm:gap-4 space-y-0 pb-2 p-4 sm:p-6">
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16 shrink-0">
                <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
                <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <CardTitle className="text-base sm:text-xl">{user?.name}</CardTitle>
                <CardDescription className="text-xs sm:text-sm break-all">
                  {user?.email}
                </CardDescription>
              </div>
              {/* Przycisk wylogowania - skrajnie do prawej */}
              <LogoutCurrentDevice />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              {/* ID użytkownika */}
              <div className="grid gap-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Identyfikator użytkownika
                </div>
                <UserIdSection userId={user?.id || ''} />
              </div>

              {/* Sekcja: motyw */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-xs sm:text-sm text-muted-foreground">Motyw:</span>
                <ThemeToggleMini />
              </div>
            </CardContent>
          </Card>

          {/* Sekcja bezpieczeństwa - na całą szerokość */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">Bezpieczeństwo sesji</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Zarządzaj aktywnymi sesjami na różnych urządzeniach.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm text-destructive font-medium">Strefa zagrożenia</p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Podejrzewasz nieautoryzowany dostęp? Wyloguj się ze wszystkich urządzeń
                  jednocześnie.
                </p>
                <LogoutAllDevices />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============================================= */}
        {/* UKŁAD DLA DESKTOP (lg+) - ORYGINALNY */}
        {/* ============================================= */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
          {/* Kolumna 1: Dane i Wygląd */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2 p-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
                  <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <CardTitle className="text-xl">{user?.name}</CardTitle>
                  <CardDescription className="text-sm break-all">{user?.email}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="mt-4 p-6 pt-0">
                <div className="grid gap-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Identyfikator użytkownika
                  </div>
                  <UserIdSection userId={user?.id || ''} />
                </div>
              </CardContent>
            </Card>

            <ThemeCard />
          </div>

          {/* Kolumna 2: Bezpieczeństwo */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="p-6 pb-3">
                <CardTitle className="text-lg">Bezpieczeństwo sesji</CardTitle>
                <CardDescription className="text-sm">
                  Zarządzaj aktywnymi sesjami na różnych urządzeniach.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-4">
                  <p className="text-sm text-destructive font-medium">Strefa zagrożenia</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Podejrzewasz nieautoryzowany dostęp? Wyloguj się ze wszystkich urządzeń.
                  </p>
                  <LogoutButtons />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
