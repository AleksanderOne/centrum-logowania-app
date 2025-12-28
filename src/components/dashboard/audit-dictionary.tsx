'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LogIn,
  LogOut,
  Key,
  FolderPlus,
  UserPlus,
  Users,
  KeyRound,
  TestTube,
  Copy,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

/**
 * Słowniczek Akcji Audytu
 *
 * Zawiera wszystkie kategorie i akcje używane w systemie logowania audytu.
 * Nazwy w bazie danych są po angielsku, w UI po polsku.
 */

// Definicja kategorii
const categories = [
  {
    id: 'login',
    nameEN: 'Login',
    namePL: 'Logowanie',
    icon: LogIn,
    color: 'bg-green-100 text-green-700 border-green-400',
    description:
      'Zdarzenia związane z logowaniem użytkowników do systemu CLA lub do projektów zewnętrznych przez SSO.',
    actions: [
      {
        id: 'login',
        nameEN: 'login',
        namePL: 'Logowanie do CLA',
        description: 'Użytkownik zalogował się do panelu administracyjnego Centrum Logowania.',
      },
      {
        id: 'login_google',
        nameEN: 'login_google',
        namePL: 'Logowanie przez Google',
        description: 'Użytkownik zalogował się do CLA używając konta Google.',
      },
      {
        id: 'login_credentials',
        nameEN: 'login_credentials',
        namePL: 'Logowanie hasłem',
        description: 'Użytkownik zalogował się do CLA używając emaila i hasła.',
      },
      {
        id: 'sso_login',
        nameEN: 'sso_login',
        namePL: 'Logowanie SSO do projektu',
        description:
          'Użytkownik został autoryzowany do zewnętrznego projektu przez mechanizm SSO. Tworzy kod autoryzacyjny.',
      },
    ],
  },
  {
    id: 'logout',
    nameEN: 'Logout',
    namePL: 'Wylogowanie',
    icon: LogOut,
    color: 'bg-blue-100 text-blue-700 border-blue-400',
    description: 'Zdarzenia związane z wylogowaniem użytkowników z projektów.',
    actions: [
      {
        id: 'logout',
        nameEN: 'logout',
        namePL: 'Wylogowanie z projektu',
        description: 'Użytkownik wylogował się z zewnętrznego projektu. Usuwa sesję projektu.',
      },
    ],
  },
  {
    id: 'token',
    nameEN: 'Tokens',
    namePL: 'Tokeny',
    icon: Key,
    color: 'bg-purple-100 text-purple-700 border-purple-400',
    description: 'Operacje związane z tokenami JWT i weryfikacją sesji.',
    actions: [
      {
        id: 'token_exchange',
        nameEN: 'token_exchange',
        namePL: 'Wymiana tokenu',
        description: 'Kod autoryzacyjny został wymieniony na token JWT. Tworzy sesję projektu.',
      },
      {
        id: 'token_verify',
        nameEN: 'token_verify',
        namePL: 'Weryfikacja tokenu',
        description: 'Token JWT został zweryfikowany przez aplikację kliencką.',
      },
      {
        id: 'session_verify',
        nameEN: 'session_verify',
        namePL: 'Weryfikacja sesji',
        description:
          'Sesja użytkownika została zweryfikowana (sprawdzenie czy sesja istnieje w bazie).',
      },
    ],
  },
  {
    id: 'project',
    nameEN: 'Projects',
    namePL: 'Projekty',
    icon: FolderPlus,
    color: 'bg-teal-100 text-teal-700 border-teal-400',
    description: 'Operacje na projektach - tworzenie, usuwanie, zmiana ustawień.',
    actions: [
      {
        id: 'project_create',
        nameEN: 'project_create',
        namePL: 'Utworzenie projektu',
        description: 'Utworzono nowy projekt w panelu administracyjnym.',
      },
      {
        id: 'project_delete',
        nameEN: 'project_delete',
        namePL: 'Usunięcie projektu',
        description: 'Usunięto projekt z systemu (wraz z sesjami i członkami).',
      },
      {
        id: 'visibility_change',
        nameEN: 'visibility_change',
        namePL: 'Zmiana widoczności',
        description: 'Zmieniono widoczność projektu na publiczny lub prywatny.',
      },
    ],
  },
  {
    id: 'member',
    nameEN: 'Members',
    namePL: 'Członkowie',
    icon: UserPlus,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-400',
    description: 'Zarządzanie członkami projektów.',
    actions: [
      {
        id: 'member_add',
        nameEN: 'member_add',
        namePL: 'Dodanie członka',
        description: 'Dodano nowego członka do projektu (przez email).',
      },
      {
        id: 'member_remove',
        nameEN: 'member_remove',
        namePL: 'Usunięcie członka',
        description: 'Usunięto członka z projektu.',
      },
    ],
  },
  {
    id: 'session',
    nameEN: 'Sessions',
    namePL: 'Sesje',
    icon: Users,
    color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-400',
    description: 'Zarządzanie aktywnymi sesjami użytkowników.',
    actions: [
      {
        id: 'session_delete',
        nameEN: 'session_delete',
        namePL: 'Usunięcie sesji',
        description: 'Administrator usunął aktywną sesję użytkownika z projektu.',
      },
    ],
  },
  {
    id: 'setup_code',
    nameEN: 'Setup Codes',
    namePL: 'Kody Setup',
    icon: KeyRound,
    color: 'bg-amber-100 text-amber-700 border-amber-400',
    description: 'Operacje na kodach konfiguracyjnych do integracji SDK.',
    actions: [
      {
        id: 'setup_code_generate',
        nameEN: 'setup_code_generate',
        namePL: 'Generowanie kodu',
        description: 'Wygenerowano nowy kod setup do konfiguracji SDK w zewnętrznej aplikacji.',
      },
      {
        id: 'setup_code_use',
        nameEN: 'setup_code_use',
        namePL: 'Użycie kodu',
        description: 'Kod setup został użyty do skonfigurowania SDK (claim).',
      },
      {
        id: 'setup_code_delete',
        nameEN: 'setup_code_delete',
        namePL: 'Usunięcie kodu',
        description: 'Usunięto nieużyty kod setup przed jego wygaśnięciem.',
      },
      {
        id: 'setup_code',
        nameEN: 'setup_code',
        namePL: 'Operacja na kodzie',
        description: 'Ogólna operacja na kodzie setup (legacy).',
      },
    ],
  },
  {
    id: 'test',
    nameEN: 'Integration Tests',
    namePL: 'Testy integracji',
    icon: TestTube,
    color: 'bg-sky-100 text-sky-700 border-sky-400',
    description: 'Testy połączenia i integracji SDK.',
    actions: [
      {
        id: 'integration_test',
        nameEN: 'integration_test',
        namePL: 'Test integracji',
        description: 'Wykonano test połączenia projektu z SDK.',
      },
    ],
  },
  {
    id: 'copy',
    nameEN: 'Clipboard',
    namePL: 'Kopiowanie',
    icon: Copy,
    color: 'bg-slate-100 text-slate-700 border-slate-400',
    description: 'Kopiowanie danych wrażliwych do schowka.',
    actions: [
      {
        id: 'copy_client_id',
        nameEN: 'copy_client_id',
        namePL: 'Kopiowanie Client ID',
        description: 'Skopiowano identyfikator projektu (slug) do schowka.',
      },
      {
        id: 'copy_api_key',
        nameEN: 'copy_api_key',
        namePL: 'Kopiowanie API Key',
        description: 'Skopiowano klucz API projektu do schowka.',
      },
    ],
  },
  {
    id: 'error',
    nameEN: 'Errors',
    namePL: 'Błędy',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 border-red-400',
    description: 'Zdarzenia błędów i ograniczeń bezpieczeństwa.',
    actions: [
      {
        id: 'access_denied',
        nameEN: 'access_denied',
        namePL: 'Odmowa dostępu',
        description: 'Użytkownik próbował uzyskać dostęp do zasobu bez uprawnień.',
      },
      {
        id: 'rate_limited',
        nameEN: 'rate_limited',
        namePL: 'Limit zapytań',
        description: 'Przekroczono limit zapytań do API (rate limiting).',
      },
      {
        id: 'kill_switch',
        nameEN: 'kill_switch',
        namePL: 'Kill Switch',
        description: 'Administrator wymusił wylogowanie użytkownika ze wszystkich projektów.',
      },
    ],
  },
];

export function AuditDictionary() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Słowniczek Akcji Audytu
        </CardTitle>
        <CardDescription>
          Szczegółowy opis wszystkich kategorii i akcji używanych w logach audytu. Nazwy w bazie
          danych są po angielsku.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">Kategorie</TabsTrigger>
            <TabsTrigger value="all-actions">Wszystkie Akcje</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-6 mt-4">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.id} className="space-y-3">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border ${category.color}`}
                  >
                    <Icon className="h-6 w-6" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{category.namePL}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {category.id}
                        </Badge>
                      </div>
                      <p className="text-sm opacity-80 mt-1">{category.description}</p>
                    </div>
                  </div>

                  <div className="ml-6 space-y-2">
                    {category.actions.map((action) => (
                      <div
                        key={action.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 border-l-4 ${category.color} bg-white dark:bg-slate-900`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-semibold text-base">{action.namePL}</span>
                            <Badge className="font-mono text-xs bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-800">
                              {action.nameEN}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{action.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="all-actions" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-semibold">Kategoria</th>
                    <th className="text-left py-3 px-2 font-semibold">Akcja (EN)</th>
                    <th className="text-left py-3 px-2 font-semibold">Nazwa (PL)</th>
                    <th className="text-left py-3 px-2 font-semibold">Opis</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.flatMap((category) =>
                    category.actions.map((action, idx) => (
                      <tr key={action.id} className="border-b hover:bg-muted/50">
                        {idx === 0 && (
                          <td className="py-2 px-2 align-top" rowSpan={category.actions.length}>
                            <Badge className={category.color}>{category.namePL}</Badge>
                          </td>
                        )}
                        <td className="py-2 px-2 font-mono text-xs">{action.nameEN}</td>
                        <td className="py-2 px-2">{action.namePL}</td>
                        <td className="py-2 px-2 text-muted-foreground text-xs max-w-md">
                          {action.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
