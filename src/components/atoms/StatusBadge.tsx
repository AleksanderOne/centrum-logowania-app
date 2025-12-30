'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StatusType } from './StatusIcon';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const variants: Record<StatusType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  success: 'default',
  error: 'destructive',
  warning: 'secondary',
  info: 'outline',
  pending: 'outline',
  skipped: 'outline',
};

const labels: Record<StatusType, string> = {
  success: 'OK',
  error: 'Błąd',
  warning: 'Uwaga',
  info: 'Info',
  pending: 'Oczekuje',
  skipped: 'Pominięto',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Fallback dla nieznanych statusów
  const variant = variants[status] || 'outline';
  const label = labels[status] || status;

  return (
    <Badge variant={variant} className={cn('ml-auto', className)}>
      {label}
    </Badge>
  );
}
