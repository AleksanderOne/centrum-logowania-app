'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  History,
  RefreshCw,
  CheckCircle,
  XCircle,
  Shield,
  LogIn,
  LogOut,
  Key,
  AlertTriangle,
  Trash2,
  Download,
  KeyRound,
  Search,
  Filter,
  Copy,
  UserPlus,
  UserMinus,
  FolderPlus,
  FolderMinus,
  TestTube,
  Users,
  Eye,
  EyeOff,
  Chrome,
  Settings,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClaLogo } from '@/components/cla-logo';

interface AuditLog {
  id: string;
  userId: string | null;
  projectId: string | null;
  action: string;
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: string | null;
  createdAt: string;
}

interface IntegrationLogResults {
  integration?: {
    message?: string;
  };
  domain?: {
    status?: string;
    message?: string;
  };
}

interface AuditLogsViewerProps {
  projectId?: string;
  limit?: number;
}

// Mapowanie akcji na ikony i kolory - WYRAŹNE KONTRASTOWE KOLORY
const actionConfig: Record<
  string,
  { icon: typeof LogIn; color: string; bgColor: string; label: string; category: string }
> = {
  // 🟢 Logowanie - ZIELONY
  login: {
    icon: LogIn,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/40 border-green-400',
    label: 'Zalogowano do systemu CLA',
    category: 'login',
  },
  login_google: {
    icon: Chrome,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/40 border-green-400',
    label: 'Zalogowano przez Google',
    category: 'login',
  },
  login_credentials: {
    icon: LogIn,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/40 border-green-400',
    label: 'Zalogowano hasłem',
    category: 'login',
  },
  sso_login: {
    icon: LogIn,
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400',
    label: 'Zalogowano do projektu (SSO)',
    category: 'login',
  },

  // 🔵 Wylogowanie - NIEBIESKI
  logout: {
    icon: LogOut,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40 border-blue-400',
    label: 'Wylogowano z aplikacji',
    category: 'logout',
  },

  // 💜 Tokeny - FIOLETOWY
  token_exchange: {
    icon: Key,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/40 border-purple-400',
    label: 'Wymieniono kod na token SSO',
    category: 'token',
  },
  token_verify: {
    icon: Shield,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30 border-purple-300',
    label: 'Zweryfikowano token',
    category: 'token',
  },
  session_verify: {
    icon: Shield,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30 border-purple-300',
    label: 'Zweryfikowano sesję',
    category: 'token',
  },

  // 🩵 Projekty - TEAL/CYAN
  project_create: {
    icon: FolderPlus,
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-100 dark:bg-teal-900/40 border-teal-400',
    label: 'Utworzono nowy projekt',
    category: 'project',
  },
  project_delete: {
    icon: FolderMinus,
    color: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-100 dark:bg-rose-900/40 border-rose-400',
    label: 'Usunięto projekt',
    category: 'project',
  },
  visibility_change: {
    icon: Eye,
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-400',
    label: 'Zmieniono widoczność projektu',
    category: 'project',
  },

  // 💙 Członkowie - INDIGO
  member_add: {
    icon: UserPlus,
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400',
    label: 'Dodano nowego członka',
    category: 'member',
  },
  member_remove: {
    icon: UserMinus,
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-100 dark:bg-pink-900/40 border-pink-400',
    label: 'Usunięto członka z projektu',
    category: 'member',
  },

  // 💜 Sesje - FUCHSIA
  session_delete: {
    icon: Users,
    color: 'text-fuchsia-700 dark:text-fuchsia-300',
    bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-900/40 border-fuchsia-400',
    label: 'Usunięto sesję użytkownika',
    category: 'session',
  },

  // 🟡 Quick Connect - ŻÓŁTY/AMBER
  setup_code_generate: {
    icon: KeyRound,
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40 border-amber-400',
    label: 'Wygenerowano kod Quick Connect',
    category: 'setup_code',
  },
  setup_code_use: {
    icon: KeyRound,
    color: 'text-lime-700 dark:text-lime-300',
    bgColor: 'bg-lime-100 dark:bg-lime-900/40 border-lime-400',
    label: 'Użyto kodu Quick Connect',
    category: 'setup_code',
  },
  setup_code_delete: {
    icon: KeyRound,
    color: 'text-stone-700 dark:text-stone-300',
    bgColor: 'bg-stone-100 dark:bg-stone-900/40 border-stone-400',
    label: 'Usunięto kod Quick Connect',
    category: 'setup_code',
  },
  setup_code: {
    icon: KeyRound,
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400',
    label: 'Operacja na kodzie Quick Connect',
    category: 'setup_code',
  },

  // 🩵 Test połączenia - CYAN
  integration_test: {
    icon: TestTube,
    color: 'text-sky-700 dark:text-sky-300',
    bgColor: 'bg-sky-100 dark:bg-sky-900/40 border-sky-400',
    label: 'Wykonano test integracji',
    category: 'test',
  },

  // 📋 Kopiowanie - SLATE
  copy_client_id: {
    icon: Copy,
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800/40 border-slate-400',
    label: 'Skopiowano Client ID (slug)',
    category: 'copy',
  },
  copy_api_key: {
    icon: Copy,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100 dark:bg-zinc-800/40 border-zinc-400',
    label: 'Skopiowano klucz API',
    category: 'copy',
  },

  // 🔴 Błędy - CZERWONY
  access_denied: {
    icon: AlertTriangle,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/40 border-red-400',
    label: 'Odmowa dostępu!',
    category: 'error',
  },
  rate_limited: {
    icon: AlertTriangle,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/40 border-orange-400',
    label: 'Przekroczono limit zapytań',
    category: 'error',
  },
  kill_switch: {
    icon: LogOut,
    color: 'text-red-800 dark:text-red-200',
    bgColor: 'bg-red-200 dark:bg-red-900/50 border-red-500',
    label: 'Wymuszone wylogowanie (Kill Switch)',
    category: 'error',
  },
};

// Kategorie filtrów
const filterCategories = [
  { value: 'all', label: 'Wszystkie kategorie' },
  { value: 'login', label: '🟢 Logowanie' },
  { value: 'logout', label: '🔵 Wylogowanie' },
  { value: 'token', label: '💜 Tokeny' },
  { value: 'project', label: '🩵 Projekty' },
  { value: 'member', label: '💙 Członkowie' },
  { value: 'session', label: '💜 Sesje' },
  { value: 'setup_code', label: '🟡 Quick Connect' },
  { value: 'test', label: '🧪 Testy' },
  { value: 'copy', label: '📋 Kopiowanie' },
  { value: 'error', label: '🔴 Błędy' },
];

// Lista akcji do filtra - z przypisaniem kategorii
const allFilterActions = [
  { value: 'login', label: 'Logowanie do CLA', category: 'login' },
  { value: 'login_google', label: 'Logowanie przez Google', category: 'login' },
  { value: 'sso_login', label: 'Logowanie SSO do projektu', category: 'login' },
  { value: 'logout', label: 'Wylogowanie', category: 'logout' },
  { value: 'token_exchange', label: 'Wymiana tokenu', category: 'token' },
  { value: 'token_verify', label: 'Weryfikacja tokenu', category: 'token' },
  { value: 'session_verify', label: 'Weryfikacja sesji', category: 'token' },
  { value: 'visibility_change', label: 'Zmiana widoczności', category: 'project' },
  { value: 'project_create', label: 'Utworzenie projektu', category: 'project' },
  { value: 'project_delete', label: 'Usunięcie projektu', category: 'project' },
  { value: 'member_add', label: 'Dodanie członka', category: 'member' },
  { value: 'member_remove', label: 'Usunięcie członka', category: 'member' },
  { value: 'session_delete', label: 'Usunięcie sesji', category: 'session' },
  { value: 'setup_code', label: 'Operacja Quick Connect', category: 'setup_code' },
  { value: 'setup_code_generate', label: 'Generowanie kodu Quick Connect', category: 'setup_code' },
  { value: 'setup_code_delete', label: 'Usunięcie kodu Quick Connect', category: 'setup_code' },
  { value: 'integration_test', label: 'Test integracji', category: 'test' },
  { value: 'copy_client_id', label: 'Kopiowanie Client ID', category: 'copy' },
  { value: 'copy_api_key', label: 'Kopiowanie API Key', category: 'copy' },
  { value: 'access_denied', label: 'Odmowa dostępu', category: 'error' },
  { value: 'rate_limited', label: 'Rate limit', category: 'error' },
  { value: 'kill_switch', label: 'Kill Switch', category: 'error' },
];

const INTERNAL_ACTIONS = new Set([
  'project_create',
  'project_delete',
  'member_add',
  'member_remove',
  'setup_code_generate',
  'setup_code_delete',
  'visibility_change',
  'login', // Login do CLA
  'logout', // Logout z CLA
  'rate_limited',
  'access_denied',
  'kill_switch',
]);

export function AuditLogsViewer({ projectId, limit = 100 }: AuditLogsViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Dynamiczne filtrowanie akcji na podstawie wybranej kategorii
  const filterActions = useMemo(() => {
    if (filterCategory === 'all') {
      return [{ value: 'all', label: 'Wszystkie akcje', category: 'all' }, ...allFilterActions];
    }
    const filtered = allFilterActions.filter((a) => a.category === filterCategory);
    return [{ value: 'all', label: `Wszystkie (${filterCategory})`, category: 'all' }, ...filtered];
  }, [filterCategory]);

  // Reset filtra akcji gdy zmieni się kategoria
  const handleCategoryChange = (value: string) => {
    setFilterCategory(value);
    setFilterAction('all'); // Resetuj akcję gdy zmieni się kategoria
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = projectId
        ? `/api/v1/audit-logs?projectId=${projectId}&limit=${limit}`
        : `/api/v1/audit-logs?limit=${limit}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Nie udało się pobrać logów');
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch {
      setError('Błąd podczas pobierania logów audytu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, limit]);

  // Filtrowanie logów
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filtr konkretnej akcji (ma priorytet)
      if (filterAction !== 'all') {
        if (log.action !== filterAction) return false;
      }
      // Filtr kategorii (jeśli nie wybrano konkretnej akcji)
      else if (filterCategory !== 'all') {
        const config = actionConfig[log.action];
        if (!config || config.category !== filterCategory) return false;
      }

      // Filtr statusu
      if (filterStatus !== 'all' && log.status !== filterStatus) {
        return false;
      }

      // Wyszukiwarka tekstowa
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const config = actionConfig[log.action] || { label: log.action };
        const metadata = log.metadata ? JSON.parse(log.metadata) : {};

        const searchableText = [
          config.label,
          log.action,
          log.ipAddress,
          metadata.userEmail,
          metadata.projectName,
          metadata.reason,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(query)) return false;
      }

      return true;
    });
  }, [logs, filterCategory, filterAction, filterStatus, searchQuery]);

  const deleteLogs = async () => {
    setDeleting(true);
    try {
      const body = projectId ? { projectId } : { all: true };

      const response = await fetch('/api/v1/audit-logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Nie udało się usunąć logów');
      }

      // Odśwież listę logów
      await fetchLogs();
    } catch {
      setError('Błąd podczas usuwania logów');
    } finally {
      setDeleting(false);
    }
  };

  // Funkcja eksportu logów do TXT
  const exportLogsToTxt = () => {
    const content = logs
      .map((log) => {
        const config = actionConfig[log.action] || { label: log.action };
        const metadata = parseMetadata(log.metadata);
        let line = `[${formatDate(log.createdAt)}] ${config.label} - ${log.status === 'success' ? 'SUKCES' : 'BŁĄD'}`;
        if (log.ipAddress) line += ` | IP: ${log.ipAddress}`;
        if (metadata?.userEmail) line += ` | Użytkownik: ${metadata.userEmail}`;
        if (metadata?.projectName) line += ` | Projekt: ${metadata.projectName}`;
        if (metadata?.reason) line += ` | Powód: ${metadata.reason}`;
        return line;
      })
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const parseMetadata = (
    metadata: string | null
  ): {
    reason?: string;
    email?: string;
    redirectUri?: string;
    projectName?: string;
    userEmail?: string;
    [key: string]: string | number | boolean | undefined;
  } | null => {
    if (!metadata) return null;
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  };

  // Wyciąga domenę z URL dla czytelności
  const extractDomain = (url: string): string => {
    try {
      const parsed = new URL(url);
      return parsed.host + (parsed.pathname !== '/' ? parsed.pathname : '');
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Logi Audytu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Logi Audytu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-8">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-shrink-0">
        {/* Header - kompaktowy layout na mobile */}
        <div className="flex items-center justify-between gap-2">
          {/* Tytuł */}
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <History className="h-5 w-5 shrink-0" />
              <span className="truncate">Logi Audytu</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm truncate">
              {projectId ? 'Projekt' : 'Wszystkie projekty'}
            </CardDescription>
          </div>

          {/* Akcje - dropdown na mobile, przyciski na desktop */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop: pełne przyciski */}
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Odśwież
              </Button>
              {logs.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportLogsToTxt}
                    className="bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Eksport
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={deleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleting ? 'Usuwanie...' : 'Wyczyść'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć wszystkie logi?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ta operacja jest nieodwracalna. Wszystkie logi audytu{' '}
                          {projectId ? 'dla tego projektu' : 'ze wszystkich projektów'} zostaną
                          trwale usunięte.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteLogs}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Usuń wszystkie
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>

            {/* Mobile: dropdown menu */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={fetchLogs}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Odśwież
                  </DropdownMenuItem>
                  {logs.length > 0 && (
                    <>
                      <DropdownMenuItem onClick={exportLogsToTxt}>
                        <Download className="h-4 w-4 mr-2" />
                        Eksport do TXT
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deleting ? 'Usuwanie...' : 'Wyczyść logi'}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Usunąć wszystkie logi?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ta operacja jest nieodwracalna. Wszystkie logi audytu{' '}
                              {projectId ? 'dla tego projektu' : 'ze wszystkich projektów'} zostaną
                              trwale usunięte.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={deleteLogs}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Usuń wszystkie
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Wyszukiwarka i filtry - kompaktowy layout */}
        <div className="flex flex-col gap-2 mt-3">
          {/* Search + przycisk filtrów na mobile */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Mobile: przycisk filtrów z dropdown */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-9 w-9 ${filterCategory !== 'all' || filterStatus !== 'all' || filterAction !== 'all' ? 'border-primary text-primary' : ''}`}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-3">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Kategoria
                      </label>
                      <Select value={filterCategory} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Kategoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {filterCategories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Status
                      </label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Wszystkie</SelectItem>
                          <SelectItem value="success">Sukces</SelectItem>
                          <SelectItem value="failure">Błąd</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Akcja
                      </label>
                      <Select value={filterAction} onValueChange={setFilterAction}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Akcja" />
                        </SelectTrigger>
                        <SelectContent>
                          {filterActions.map((action) => (
                            <SelectItem key={action.value} value={action.value}>
                              {action.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(filterCategory !== 'all' ||
                      filterStatus !== 'all' ||
                      filterAction !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => {
                          setFilterCategory('all');
                          setFilterStatus('all');
                          setFilterAction('all');
                        }}
                      >
                        Wyczyść filtry
                      </Button>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Desktop: filtry w rzędzie */}
          <div className="hidden sm:grid sm:grid-cols-3 gap-2">
            <Select value={filterCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                {filterCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="success">Sukces</SelectItem>
                <SelectItem value="failure">Błąd</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Akcja" />
              </SelectTrigger>
              <SelectContent>
                {filterActions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Licznik wyników */}
        {(searchQuery ||
          filterCategory !== 'all' ||
          filterAction !== 'all' ||
          filterStatus !== 'all') && (
          <div className="text-xs text-muted-foreground mt-2">
            Znaleziono: {filteredLogs.length} z {logs.length} wpisów
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {logs.length === 0
              ? 'Brak logów do wyświetlenia'
              : 'Brak wyników dla wybranych filtrów'}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                const config = actionConfig[log.action] || {
                  icon: Shield,
                  color: 'text-gray-500',
                  bgColor: 'bg-gray-500/10 border-gray-500/30',
                  label: log.action,
                };
                const Icon = config.icon;
                const metadata = parseMetadata(log.metadata);

                const isInternal = INTERNAL_ACTIONS.has(log.action);

                return (
                  <div
                    key={log.id}
                    className={`p-2 sm:p-4 rounded-lg sm:rounded-xl border-2 border-l-4 sm:border-l-[6px] ${config.bgColor} shadow-sm hover:shadow-md transition-all duration-200`}
                  >
                    {/* ============ MOBILE LAYOUT (< sm) ============ */}
                    <div className="sm:hidden">
                      {/* Nagłówek kompaktowy */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                        <span
                          className={`text-xs font-bold tracking-tight ${config.color} truncate flex-1`}
                        >
                          {config.label}
                        </span>
                        {isInternal && (
                          <div title="CLA">
                            <ClaLogo size={12} className="opacity-80 shrink-0" />
                          </div>
                        )}
                      </div>

                      {/* Dane w grid 2 kolumny */}
                      <div className="text-[10px] font-medium text-foreground/90 bg-background/40 p-1.5 rounded">
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                          {log.ipAddress && (
                            <div>
                              <span className="text-muted-foreground uppercase text-[8px]">IP</span>
                              <div className="font-mono font-bold truncate">{log.ipAddress}</div>
                            </div>
                          )}
                          {metadata?.projectName && (
                            <div>
                              <span className="text-muted-foreground uppercase text-[8px]">
                                Projekt
                              </span>
                              <div className="font-bold uppercase truncate">
                                {metadata.projectName}
                              </div>
                            </div>
                          )}
                          {metadata?.redirectUri && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground uppercase text-[8px]">
                                Witryna
                              </span>
                              <div className="font-mono font-bold truncate">
                                {extractDomain(metadata.redirectUri)}
                              </div>
                            </div>
                          )}
                          {metadata?.userEmail && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground uppercase text-[8px]">
                                User
                              </span>
                              <div className="font-semibold truncate">{metadata.userEmail}</div>
                            </div>
                          )}
                          {(metadata?.isPublic !== undefined ||
                            metadata?.IsPublic !== undefined) && (
                            <div>
                              <span className="text-muted-foreground uppercase text-[8px]">
                                Status
                              </span>
                              {metadata.isPublic === true ||
                              metadata.IsPublic === true ||
                              metadata.isPublic === 'true' ||
                              metadata.IsPublic === 'true' ? (
                                <div className="flex items-center gap-0.5 font-bold text-green-600 dark:text-green-400">
                                  <Eye className="h-2.5 w-2.5" /> Publiczny
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 font-bold text-slate-600 dark:text-slate-400">
                                  <EyeOff className="h-2.5 w-2.5" /> Prywatny
                                </div>
                              )}
                            </div>
                          )}
                          {log.action === 'integration_test' && metadata?.results && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground uppercase text-[8px]">
                                Wynik
                              </span>
                              <div className="font-semibold truncate">
                                {
                                  (metadata.results as unknown as IntegrationLogResults).integration
                                    ?.message
                                }
                              </div>
                            </div>
                          )}
                          {metadata?.reason && (
                            <div className="col-span-2 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 px-1 py-0.5 rounded">
                              <span className="uppercase text-[8px] opacity-80">Powód</span>
                              <div className="font-bold truncate">{metadata.reason}</div>
                            </div>
                          )}
                          {metadata &&
                            Object.entries(metadata).map(([key, value]) => {
                              if (
                                [
                                  'redirectUri',
                                  'projectName',
                                  'userEmail',
                                  'reason',
                                  'results',
                                  'isPublic',
                                  'IsPublic',
                                ].includes(key)
                              )
                                return null;
                              if (typeof value === 'object') return null;
                              return (
                                <div key={key}>
                                  <span className="text-muted-foreground uppercase text-[8px] capitalize">
                                    {key}
                                  </span>
                                  <div className="truncate">{String(value)}</div>
                                </div>
                              );
                            })}
                        </div>
                        {/* Stopka mobile */}
                        <div className="flex items-center justify-between gap-1 pt-1.5 mt-1.5 border-t border-border/20 text-[9px]">
                          <Badge
                            variant="outline"
                            className="font-mono text-[8px] text-foreground/60 px-1 py-0 h-4"
                          >
                            {log.action}
                          </Badge>
                          {log.status === 'success' ? (
                            <span className="text-green-600 font-bold flex items-center gap-0.5">
                              <CheckCircle className="h-2.5 w-2.5" />
                              OK
                            </span>
                          ) : (
                            <span className="text-red-600 font-bold flex items-center gap-0.5">
                              <XCircle className="h-2.5 w-2.5" />
                              ERR
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {formatDate(log.createdAt).split(' ')[0]}
                          </span>
                          <span className="text-muted-foreground">
                            {formatDate(log.createdAt).split(' ')[1]}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ============ TABLET LAYOUT (sm - lg) ============ */}
                    <div className="hidden sm:block lg:hidden">
                      {/* Nagłówek: Ikona + Tytuł */}
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-6 w-6 shrink-0 ${config.color}`} />
                        <span
                          className={`text-base font-bold tracking-tight ${config.color} truncate flex-1`}
                        >
                          {config.label}
                        </span>
                        {isInternal && (
                          <div title="Akcja wewnętrzna CLA">
                            <ClaLogo size={16} className="opacity-80 shrink-0" />
                          </div>
                        )}
                      </div>

                      {/* Blok z informacjami */}
                      <div className="text-sm font-medium text-foreground/90 space-y-1.5 bg-background/40 p-2 rounded-md mb-2">
                        {log.ipAddress && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-semibold">IP:</span>
                            <span className="font-mono text-foreground font-bold">
                              {log.ipAddress}
                            </span>
                          </div>
                        )}
                        {metadata && Object.keys(metadata).length > 0 && (
                          <>
                            {log.action === 'integration_test' && metadata.results && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-semibold">Wynik:</span>
                                <span className="font-semibold">
                                  {
                                    (metadata.results as unknown as IntegrationLogResults)
                                      .integration?.message
                                  }
                                </span>
                              </div>
                            )}
                            {(metadata.isPublic !== undefined ||
                              metadata.IsPublic !== undefined) && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-semibold">Status:</span>
                                {metadata.isPublic === true ||
                                metadata.IsPublic === true ||
                                metadata.isPublic === 'true' ||
                                metadata.IsPublic === 'true' ? (
                                  <span className="flex items-center gap-1 font-bold text-green-600 dark:text-green-400">
                                    <Eye className="h-3.5 w-3.5" /> Publiczny
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400">
                                    <EyeOff className="h-3.5 w-3.5" /> Prywatny
                                  </span>
                                )}
                              </div>
                            )}
                            {metadata.redirectUri && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground font-semibold shrink-0">
                                  Witryna:
                                </span>
                                <span className="font-mono text-foreground font-bold break-all">
                                  {extractDomain(metadata.redirectUri)}
                                </span>
                              </div>
                            )}
                            {metadata.projectName && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-semibold">
                                  Projekt:
                                </span>
                                <span className="text-foreground font-bold uppercase tracking-wide bg-background/60 px-1.5 py-0.5 rounded border border-border/20 text-xs">
                                  {metadata.projectName}
                                </span>
                              </div>
                            )}
                            {metadata.userEmail && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-semibold">User:</span>
                                <span className="font-semibold text-foreground break-all">
                                  {metadata.userEmail}
                                </span>
                              </div>
                            )}
                            {metadata.reason && (
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded">
                                <span>Powód:</span>
                                <span className="break-all">{metadata.reason}</span>
                              </div>
                            )}
                            {Object.entries(metadata).map(([key, value]) => {
                              if (
                                [
                                  'redirectUri',
                                  'projectName',
                                  'userEmail',
                                  'reason',
                                  'results',
                                  'isPublic',
                                  'IsPublic',
                                ].includes(key)
                              )
                                return null;
                              if (typeof value === 'object') return null;
                              return (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-semibold capitalize">
                                    {key}:
                                  </span>
                                  <span className="text-foreground font-medium truncate max-w-[300px]">
                                    {String(value)}
                                  </span>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>

                      {/* Status | Akcja - rozpychane */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        {log.status === 'success' ? (
                          <Badge className="bg-green-600 hover:bg-green-700 text-white text-[10px] px-2 py-0.5 font-bold shadow-sm uppercase tracking-wider">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            SUKCES
                          </Badge>
                        ) : (
                          <Badge className="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-0.5 font-bold shadow-sm uppercase tracking-wider">
                            <XCircle className="h-3 w-3 mr-1" />
                            BŁĄD
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="font-mono text-xs text-foreground/90 font-bold bg-background/60 py-1"
                        >
                          {log.action}
                        </Badge>
                      </div>

                      {/* Data | Godzina - rozpychane */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="font-bold text-foreground">
                          {formatDate(log.createdAt).split(' ')[0]}
                        </span>
                        <span className="font-semibold">
                          {formatDate(log.createdAt).split(' ')[1]}
                        </span>
                      </div>
                    </div>

                    {/* ============ DESKTOP LAYOUT (>= lg) ============ */}
                    <div className="hidden lg:flex lg:flex-row lg:items-stretch lg:gap-4">
                      {/* Ikona */}
                      <div className="flex flex-col justify-center items-center shrink-0">
                        <Icon className={`h-8 w-8 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span
                            className={`text-lg md:text-xl font-extrabold tracking-tight ${config.color} drop-shadow-sm`}
                          >
                            {config.label}
                          </span>
                          {isInternal && (
                            <div title="Akcja wewnętrzna Centrum Logowania">
                              <ClaLogo size={18} className="opacity-100" />
                            </div>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="text-sm font-medium text-foreground/90 space-y-1.5 bg-background/40 p-2 rounded-md">
                          {log.ipAddress && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-semibold">IP:</span>
                              <span className="font-mono text-foreground font-bold">
                                {log.ipAddress}
                              </span>
                            </div>
                          )}
                          {metadata && Object.keys(metadata).length > 0 && (
                            <>
                              {log.action === 'integration_test' && metadata.results && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-semibold">
                                    Wynik:
                                  </span>
                                  <span className="font-semibold">
                                    {
                                      (metadata.results as unknown as IntegrationLogResults)
                                        .integration?.message
                                    }
                                  </span>
                                </div>
                              )}
                              {(metadata.isPublic !== undefined ||
                                metadata.IsPublic !== undefined) && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-semibold">
                                    Status:
                                  </span>
                                  {metadata.isPublic === true ||
                                  metadata.IsPublic === true ||
                                  metadata.isPublic === 'true' ||
                                  metadata.IsPublic === 'true' ? (
                                    <span className="flex items-center gap-1 font-bold text-green-600 dark:text-green-400">
                                      <Eye className="h-4 w-4" /> Publiczny
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400">
                                      <EyeOff className="h-4 w-4" /> Prywatny
                                    </span>
                                  )}
                                </div>
                              )}
                              {metadata.redirectUri && (
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground font-semibold shrink-0">
                                    Witryna:
                                  </span>
                                  <span className="font-mono text-foreground font-bold break-all">
                                    {extractDomain(metadata.redirectUri)}
                                  </span>
                                </div>
                              )}
                              {metadata.projectName && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-semibold">
                                    Projekt:
                                  </span>
                                  <span className="text-foreground font-bold uppercase tracking-wide bg-background/60 px-1.5 py-0.5 rounded border border-border/20 text-xs">
                                    {metadata.projectName}
                                  </span>
                                </div>
                              )}
                              {metadata.userEmail && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-semibold">User:</span>
                                  <span className="font-semibold text-foreground break-all">
                                    {metadata.userEmail}
                                  </span>
                                </div>
                              )}
                              {metadata.reason && (
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded">
                                  <span>Powód:</span>
                                  <span className="break-all">{metadata.reason}</span>
                                </div>
                              )}
                              {Object.entries(metadata).map(([key, value]) => {
                                if (
                                  [
                                    'redirectUri',
                                    'projectName',
                                    'userEmail',
                                    'reason',
                                    'results',
                                    'isPublic',
                                    'IsPublic',
                                  ].includes(key)
                                )
                                  return null;
                                if (typeof value === 'object') return null;
                                return (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-semibold capitalize">
                                      {key}:
                                    </span>
                                    <span className="text-foreground font-medium truncate max-w-[300px]">
                                      {String(value)}
                                    </span>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>

                      {/* STATUS + DATA - po prawej */}
                      <div className="flex flex-col items-end justify-between pl-4 ml-auto min-w-[140px] shrink-0 border-l border-border/10">
                        <div className="flex flex-col items-end gap-2 w-full">
                          {log.status === 'success' ? (
                            <Badge className="bg-green-600 hover:bg-green-700 text-white text-[10px] px-2 py-0.5 justify-center font-bold shadow-sm uppercase tracking-wider">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              SUKCES
                            </Badge>
                          ) : (
                            <Badge className="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-0.5 justify-center font-bold shadow-sm uppercase tracking-wider">
                              <XCircle className="h-3 w-3 mr-1" />
                              BŁĄD
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="font-mono text-xs justify-center text-foreground/90 font-bold bg-background/60 py-1 w-full"
                          >
                            {log.action}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-foreground">
                            {formatDate(log.createdAt).split(' ')[0]}
                          </div>
                          <div className="text-xs font-semibold text-muted-foreground">
                            {formatDate(log.createdAt).split(' ')[1]}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
