import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogoutButtons } from '@/components/dashboard/logout-buttons';
import { ThemeCard } from '@/components/dashboard/theme-card';
import { Separator } from '@/components/ui/separator';
import { UserIdSection } from '@/components/dashboard/user-id-section';

export default async function UserProfilePage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profil Użytkownika</h2>
          <p className="text-muted-foreground">Zarządzaj swoim kontem i sesjami logowania.</p>
        </div>
        <Separator />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Kolumna 1: Dane i Wygląd */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
                  <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <CardTitle className="text-xl">{user?.name}</CardTitle>
                  <CardDescription className="text-sm">{user?.email}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="mt-4">
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
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Bezpieczeństwo sesji</CardTitle>
                <CardDescription>
                  Zarządzaj aktywnymi sesjami na wszystkich urządzeniach.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-4">
                  <p className="text-sm text-destructive font-medium">Strefa zagrożenia</p>
                  <p className="text-sm text-muted-foreground">
                    Jeśli podejrzewasz nieautoryzowany dostęp, możesz wylogować się ze wszystkich
                    urządzeń jednocześnie.
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
