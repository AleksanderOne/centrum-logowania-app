'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  Users,
  Globe,
  Clock,
  Trash2,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { toast } from 'sonner';
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

interface Session {
  id: string;
  userEmail: string;
  userName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
}

interface SessionsData {
  sessions: Session[];
  stats: {
    total: number;
    activeToday: number;
    activeThisWeek: number;
  };
}

interface SessionsMonitorProps {
  projectId: string;
  projectName: string;
}

// Prosty parser user-agent do wykrywania typu urządzenia
const getDeviceIcon = (userAgent: string | null) => {
  if (!userAgent) return <Monitor className="w-4 h-4" />;

  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
    return <Smartphone className="w-4 h-4" />;
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return <Tablet className="w-4 h-4" />;
  }
  return <Monitor className="w-4 h-4" />;
};

const getBrowserName = (userAgent: string | null): string => {
  if (!userAgent) return 'Nieznana przeglądarka';

  const ua = userAgent.toLowerCase();
  // Kolejność jest ważna - Opera i Edge mają "chrome" w user agent
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('chrome')) return 'Chrome';
  return 'Inna przeglądarka';
};

/* v8 ignore start */
const formatTimeAgo = (dateString: string | null): string => {
  if (!dateString) return 'Nieznany czas';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Przed chwilą';
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays < 7) return `${diffDays} dni temu`;
  return date.toLocaleDateString('pl-PL');
};
/* v8 ignore stop */

export const SessionsMonitor = ({ projectId, projectName }: SessionsMonitorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<SessionsData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/project/${projectId}/sessions`);
      if (!response.ok) throw new Error('Błąd pobierania sesji');
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error('Nie udało się pobrać sesji');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const deleteSession = async (sessionId: string) => {
    setDeletingId(sessionId);
    try {
      const response = await fetch(`/api/v1/project/${projectId}/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Błąd usuwania sesji');
      toast.success('Sesja usunięta');
      fetchSessions();
    } catch (error) {
      toast.error('Nie udało się usunąć sesji');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="gap-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20 hover:border-violet-500/50 transition-all"
          variant="outline"
        >
          <Users className="w-4 h-4" />
          Aktywne sesje
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Aktywne sesje
          </DialogTitle>
          <DialogDescription>
            Użytkownicy zalogowani w projekcie <strong>{projectName}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Statystyki */}
        {data?.stats && (
          <div className="grid grid-cols-3 gap-4 py-2">
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 border">
              <span className="text-2xl font-bold text-primary">{data.stats.total}</span>
              <span className="text-xs text-muted-foreground">Wszystkie sesje</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
              <span className="text-2xl font-bold text-green-600">{data.stats.activeToday}</span>
              <span className="text-xs text-muted-foreground">Aktywne dziś</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <span className="text-2xl font-bold text-blue-600">{data.stats.activeThisWeek}</span>
              <span className="text-xs text-muted-foreground">Aktywne (tydzień)</span>
            </div>
          </div>
        )}

        {/* Lista sesji */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Ładowanie sesji...</p>
            </div>
          ) : data?.sessions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <Users className="w-12 h-12 text-muted-foreground/50" />
              <div>
                <p className="font-medium">Brak aktywnych sesji</p>
                <p className="text-sm text-muted-foreground">
                  Nikt jeszcze nie zalogował się przez SSO do tego projektu.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getDeviceIcon(session.userAgent)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {session.userName || session.userEmail}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getBrowserName(session.userAgent)}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground truncate">{session.userEmail}</p>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(session.lastSeenAt)}
                      </span>
                      {session.ipAddress && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {session.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-400 hover:text-red-500 hover:bg-red-50"
                        disabled={deletingId === session.id}
                      >
                        {deletingId === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usuń sesję?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Usunięcie sesji spowoduje wylogowanie użytkownika{' '}
                          <strong>{session.userEmail}</strong> z tego projektu. Będzie musiał
                          zalogować się ponownie.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSession(session.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Usuń sesję
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between pt-2 border-t">
          <Button variant="outline" onClick={fetchSessions} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
