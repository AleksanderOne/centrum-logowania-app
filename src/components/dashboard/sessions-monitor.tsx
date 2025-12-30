'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
import { ColoredButton } from '@/components/atoms';
import { ModalContainer, ModalFooter } from '@/components/molecules';

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
    <ModalContainer
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <ColoredButton color="fuchsia" icon={<Users className="w-4 h-4" />}>
          <span className="text-xs">Sesje</span>
        </ColoredButton>
      }
      title="Aktywne sesje"
      titleIcon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />}
      description={
        <>
          Projekt: <strong>{projectName}</strong>
        </>
      }
      maxWidth="2xl"
      useScrollArea
      footer={
        <ModalFooter
          onClose={() => setIsOpen(false)}
          primaryAction={{
            label: 'Odśwież',
            icon: (
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
            ),
            onClick: fetchSessions,
            disabled: isLoading,
          }}
        />
      }
    >
      {/* Statystyki */}
      {data?.stats && (
        <div className="shrink-0 flex sm:grid sm:grid-cols-3 gap-1.5 sm:gap-4 py-1 sm:py-2">
          <div className="flex-1 flex items-center justify-center gap-1.5 sm:flex-col sm:gap-0 p-1.5 sm:p-3 rounded-md sm:rounded-lg bg-muted/50 border">
            <span className="text-sm sm:text-2xl font-bold text-primary">{data.stats.total}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">wszystkie</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5 sm:flex-col sm:gap-0 p-1.5 sm:p-3 rounded-md sm:rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
            <span className="text-sm sm:text-2xl font-bold text-green-600">
              {data.stats.activeToday}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">dziś</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5 sm:flex-col sm:gap-0 p-1.5 sm:p-3 rounded-md sm:rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
            <span className="text-sm sm:text-2xl font-bold text-blue-600">
              {data.stats.activeThisWeek}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">tydzień</span>
          </div>
        </div>
      )}

      {/* Lista sesji */}
      <ScrollArea className="flex-1 min-h-0 pr-2 sm:pr-4">
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
          <div className="space-y-2 sm:space-y-3">
            {data?.sessions.map((session) => (
              <div
                key={session.id}
                className="relative p-2.5 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Przycisk usuń */}
                <div className="absolute top-1.5 right-1.5 sm:static sm:float-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                        disabled={deletingId === session.id}
                      >
                        {deletingId === session.id ? (
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

                {/* Treść sesji */}
                <div className="flex items-start gap-2 sm:gap-4 pr-8 sm:pr-0">
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {getDeviceIcon(session.userAgent)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="font-medium text-xs sm:text-base truncate">
                        {session.userName || session.userEmail}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] sm:text-xs shrink-0 px-1 sm:px-2"
                      >
                        {getBrowserName(session.userAgent)}
                      </Badge>
                    </div>

                    <p className="text-[10px] sm:text-sm text-muted-foreground truncate">
                      {session.userEmail}
                    </p>

                    <div className="flex items-center gap-2 sm:gap-4 mt-0.5 sm:mt-2 text-[9px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5 sm:gap-1">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {formatTimeAgo(session.lastSeenAt)}
                      </span>
                      {session.ipAddress && (
                        <span className="flex items-center gap-0.5 sm:gap-1">
                          <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          {session.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </ModalContainer>
  );
};
