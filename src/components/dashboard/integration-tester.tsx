'use client';

import { useState } from 'react';
import { Loader2, Globe, Users, Zap, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { ColoredButton, StatusIcon, StatusBadge, type StatusType } from '@/components/atoms';
import { ModalContainer, ModalFooter } from '@/components/molecules';

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
      setResults(null);
      runTest();
    }
  };

  const getIntegrationBgClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900';
      default:
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900';
    }
  };

  const getIntegrationIconClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-amber-600';
    }
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onOpenChange={handleOpen}
      trigger={
        <ColoredButton color="cyan" icon={<TestTube className="w-4 h-4" />}>
          <span className="text-xs">Testuj</span>
        </ColoredButton>
      }
      title="Test integracji"
      titleIcon={<Zap className="w-5 h-5 text-primary" />}
      description={
        <>
          Sprawdzanie statusu projektu <strong>{projectName}</strong>
        </>
      }
      maxWidth="md"
      footer={
        <ModalFooter
          onClose={() => setIsOpen(false)}
          primaryAction={{
            label: 'Testuj ponownie',
            loadingLabel: 'Testowanie...',
            icon: <TestTube className="w-3 h-3 sm:w-4 sm:h-4" />,
            onClick: runTest,
            isLoading: isLoading,
          }}
        />
      }
    >
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
                  <StatusBadge status={results.domain.status as StatusType} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{results.domain.message}</p>
                {results.domain.responseTime && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Czas odpowiedzi: {results.domain.responseTime}ms
                  </p>
                )}
              </div>
              <StatusIcon status={results.domain.status as StatusType} />
            </div>

            {/* Sesje */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
              <Users className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Sesje ({results.sessions.count})</span>
                  <StatusBadge status={results.sessions.status as StatusType} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{results.sessions.message}</p>
                {results.sessions.lastActivity && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ostatnia aktywność:{' '}
                    {new Date(results.sessions.lastActivity).toLocaleString('pl-PL')}
                  </p>
                )}
              </div>
              <StatusIcon status={results.sessions.status as StatusType} />
            </div>

            {/* Ogólna ocena */}
            <div
              className={`flex items-start gap-3 p-3 rounded-lg border ${getIntegrationBgClass(results.integration.status)}`}
            >
              <Zap
                className={`w-5 h-5 mt-0.5 ${getIntegrationIconClass(results.integration.status)}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Integracja</span>
                  <StatusBadge status={results.integration.status as StatusType} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{results.integration.message}</p>
              </div>
              <StatusIcon status={results.integration.status as StatusType} />
            </div>
          </div>
        ) : null}
      </div>
    </ModalContainer>
  );
};
