'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';

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

interface AuditLogsViewerProps {
  projectId?: string;
  limit?: number;
}

// Mapowanie akcji na ikony i kolory
const actionConfig: Record<string, { icon: typeof LogIn; color: string; label: string }> = {
  login: { icon: LogIn, color: 'text-green-500', label: 'Logowanie' },
  logout: { icon: LogOut, color: 'text-blue-500', label: 'Wylogowanie' },
  token_exchange: { icon: Key, color: 'text-purple-500', label: 'Wymiana tokenu' },
  session_verify: { icon: Shield, color: 'text-cyan-500', label: 'Weryfikacja sesji' },
  token_verify: { icon: Shield, color: 'text-cyan-500', label: 'Weryfikacja tokenu' },
  access_denied: { icon: AlertTriangle, color: 'text-red-500', label: 'Odmowa dostępu' },
  rate_limited: { icon: AlertTriangle, color: 'text-orange-500', label: 'Rate limit' },
  kill_switch: { icon: LogOut, color: 'text-red-500', label: 'Kill Switch' },
  project_access: { icon: Shield, color: 'text-green-500', label: 'Dostęp do projektu' },
};

export function AuditLogsViewer({ projectId, limit = 50 }: AuditLogsViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Logi Audytu
            </CardTitle>
            <CardDescription>
              Historia zdarzeń uwierzytelniania{' '}
              {projectId ? 'dla projektu' : '(wszystkie projekty)'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Brak logów do wyświetlenia</div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {logs.map((log) => {
                const config = actionConfig[log.action] || {
                  icon: Shield,
                  color: 'text-gray-500',
                  label: log.action,
                };
                const Icon = config.icon;
                const metadata = parseMetadata(log.metadata);

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{config.label}</span>
                        <Badge
                          variant={log.status === 'success' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {log.status === 'success' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {log.status === 'success' ? 'Sukces' : 'Błąd'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(log.createdAt)} • IP: {log.ipAddress || 'Nieznane'}
                      </div>
                      {metadata && Object.keys(metadata).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {/* Strona/witryna docelowa */}
                          {metadata.redirectUri && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground/70">Witryna:</span>
                              <span className="font-mono text-foreground/80 truncate max-w-[300px]">
                                {extractDomain(metadata.redirectUri)}
                              </span>
                            </div>
                          )}
                          {/* Projekt */}
                          {metadata.projectName && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground/70">Projekt:</span>
                              <span className="font-medium text-foreground/80">
                                {metadata.projectName}
                              </span>
                            </div>
                          )}
                          {/* Email użytkownika */}
                          {metadata.userEmail && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground/70">Użytkownik:</span>
                              <span>{metadata.userEmail}</span>
                            </div>
                          )}
                          {/* Powód błędu */}
                          {metadata.reason && (
                            <div className="flex items-center gap-1 text-red-500">
                              <span>Powód:</span>
                              <span>{metadata.reason}</span>
                            </div>
                          )}
                        </div>
                      )}
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
