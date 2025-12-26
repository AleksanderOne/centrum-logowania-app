'use client';

import { useEffect, useState } from 'react';
import type { HealthStatus } from '@/app/api/health/route';

// Konfiguracja statusów
const STATUS_CONFIG = {
  operational: {
    label: 'Operational',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    description: 'Wszystkie systemy działają prawidłowo',
  },
  degraded: {
    label: 'Degraded',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    description: 'Niektóre usługi mogą działać wolniej',
  },
  outage: {
    label: 'Outage',
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    description: 'Występują problemy z systemem',
  },
  loading: {
    label: 'Sprawdzanie...',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-400',
    description: 'Trwa sprawdzanie statusu',
  },
  error: {
    label: 'Niedostępny',
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-500',
    description: 'Nie można sprawdzić statusu',
  },
} as const;

type StatusType = keyof typeof STATUS_CONFIG;

interface SystemStatusProps {
  // Interwał odświeżania w ms (domyślnie 30 sekund)
  refreshInterval?: number;
  // Czy pokazywać szczegóły serwisów
  showDetails?: boolean;
}

export function SystemStatus({ refreshInterval = 30000, showDetails = false }: SystemStatusProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [currentStatus, setCurrentStatus] = useState<StatusType>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pobieranie statusu z API
  const fetchHealth = async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch('/api/health', {
        cache: 'no-store',
      });

      const data: HealthStatus = await response.json();
      setHealth(data);
      setCurrentStatus(data.status);
    } catch {
      setCurrentStatus('error');
      setHealth(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Pierwsze pobranie
    fetchHealth();

    // Ustawienie interwału odświeżania
    const interval = setInterval(fetchHealth, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const config = STATUS_CONFIG[currentStatus];

  return (
    <div className="space-y-2">
      {/* Główny status */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-muted-foreground">Status systemu:</span>
        <div className="flex items-center gap-1.5">
          {/* Pulsująca kropka statusu */}
          <span className="relative flex h-2 w-2">
            {currentStatus === 'operational' && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.bgColor} opacity-75`}
              />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${config.bgColor} ${
                isRefreshing ? 'animate-pulse' : ''
              }`}
            />
          </span>
          <span className={`font-medium ${config.color}`}>{config.label}</span>
        </div>
      </div>

      {/* Szczegóły serwisów (opcjonalne) */}
      {showDetails && health && (
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                health.services.database.status === 'up' ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <span>
              DB {health.services.database.latency ? `(${health.services.database.latency}ms)` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                health.services.auth.status === 'up' ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <span>Auth</span>
          </div>
        </div>
      )}
    </div>
  );
}
