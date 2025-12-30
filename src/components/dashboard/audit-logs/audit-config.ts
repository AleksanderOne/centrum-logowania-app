import {
  LogIn,
  LogOut,
  Key,
  Shield,
  FolderPlus,
  FolderMinus,
  Eye,
  UserPlus,
  UserMinus,
  Users,
  KeyRound,
  TestTube,
  Copy,
  AlertTriangle,
  Chrome,
} from 'lucide-react';

// Mapowanie akcji na ikony i kolory
export const actionConfig: Record<
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
export const filterCategories = [
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

// Lista akcji do filtra
export const allFilterActions = [
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

// Akcje wewnętrzne CLA
export const INTERNAL_ACTIONS = new Set([
  'project_create',
  'project_delete',
  'member_add',
  'member_remove',
  'setup_code_generate',
  'setup_code_delete',
  'visibility_change',
  'login',
  'logout',
  'rate_limited',
  'access_denied',
  'kill_switch',
]);

// Typy
export interface AuditLog {
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

export interface IntegrationLogResults {
  integration?: {
    message?: string;
  };
  domain?: {
    status?: string;
    message?: string;
  };
}

export interface ParsedMetadata {
  reason?: string;
  email?: string;
  redirectUri?: string;
  projectName?: string;
  userEmail?: string;
  isPublic?: boolean | string;
  IsPublic?: boolean | string;
  results?: IntegrationLogResults;
  [key: string]: string | number | boolean | undefined | IntegrationLogResults;
}

// Funkcje pomocnicze
export const formatDate = (dateStr: string): string => {
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

export const parseMetadata = (metadata: string | null): ParsedMetadata | null => {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
};

export const extractDomain = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.host + (parsed.pathname !== '/' ? parsed.pathname : '');
  } catch {
    return url;
  }
};
