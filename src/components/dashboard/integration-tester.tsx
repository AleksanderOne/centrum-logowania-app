'use client';

import { useState } from 'react';
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
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  Users,
  Zap,
  TestTube,
} from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  domain: {
    status: 'success' | 'error' | 'pending' | 'skipped';
    message: string;
    responseTime?: number;
  };
  sessions: {
    status: 'success' | 'warning' | 'info';
    message: string;
    count: number;
    lastActivity?: string | null;
  };
  integration: {
    status: 'success' | 'warning' | 'error';
    message: string;
  };
}

interface IntegrationTesterProps {
  projectId: string;
  projectName: string;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-amber-500" />;
    case 'skipped':
      return <AlertCircle className="w-5 h-5 text-zinc-400" />;
    default:
      return <AlertCircle className="w-5 h-5 text-blue-500" />;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    success: 'default',
    error: 'destructive',
    warning: 'secondary',
    info: 'outline',
    skipped: 'outline',
  };

  const labels: Record<string, string> = {
    success: 'OK',
    error: 'Błąd',
    warning: 'Uwaga',
    info: 'Info',
    skipped: 'Pominięto',
  };

  return (
    <Badge variant={variants[status] || 'outline'} className="ml-auto">
      {labels[status] || status}
    </Badge>
  );
};

export const IntegrationTester = ({ projectId, projectName }: IntegrationTesterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setResults(null);

    try {
      const response = await fetch(`/api/v1/project/${projectId}/test`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Błąd podczas testowania');
      }

      const data = await response.json();
      setResults(data.results);
      toast.success('Test zakończony!');
    } catch (error) {
      toast.error('Nie udało się wykonać testu');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Zawsze wykonuj test przy otwarciu modala
      setResults(null);
      runTest();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="w-full gap-1.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
          variant="outline"
        >
          <TestTube className="w-4 h-4" />
          <span className="text-xs">Testuj</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Test integracji
          </DialogTitle>
          <DialogDescription>
            Sprawdzanie statusu projektu <strong>{projectName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Trwa testowanie...</p>
            </div>
          ) : results ? (
            <div className="space-y-3">
              {/* Test domeny */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <Globe className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Domena</span>
                    <StatusBadge status={results.domain.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{results.domain.message}</p>
                  {results.domain.responseTime && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Czas odpowiedzi: {results.domain.responseTime}ms
                    </p>
                  )}
                </div>
                <StatusIcon status={results.domain.status} />
              </div>

              {/* Sesje */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <Users className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Sesje ({results.sessions.count})</span>
                    <StatusBadge status={results.sessions.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{results.sessions.message}</p>
                  {results.sessions.lastActivity && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ostatnia aktywność:{' '}
                      {new Date(results.sessions.lastActivity).toLocaleString('pl-PL')}
                    </p>
                  )}
                </div>
                <StatusIcon status={results.sessions.status} />
              </div>

              {/* Ogólna ocena */}
              <div
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  results.integration.status === 'success'
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900'
                    : results.integration.status === 'error'
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900'
                      : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900'
                }`}
              >
                <Zap
                  className={`w-5 h-5 mt-0.5 ${
                    results.integration.status === 'success'
                      ? 'text-green-600'
                      : results.integration.status === 'error'
                        ? 'text-red-600'
                        : 'text-amber-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Integracja</span>
                    <StatusBadge status={results.integration.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {results.integration.message}
                  </p>
                </div>
                <StatusIcon status={results.integration.status} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Zamknij
          </Button>
          <Button onClick={runTest} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testowanie...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Testuj ponownie
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
