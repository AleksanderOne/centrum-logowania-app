'use client';

import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'skipped';

interface StatusIconProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const statusConfig: Record<StatusType, { icon: typeof CheckCircle2; colorClass: string }> = {
  success: { icon: CheckCircle2, colorClass: 'text-green-500' },
  error: { icon: XCircle, colorClass: 'text-red-500' },
  warning: { icon: AlertCircle, colorClass: 'text-amber-500' },
  info: { icon: AlertCircle, colorClass: 'text-blue-500' },
  pending: { icon: AlertCircle, colorClass: 'text-blue-500' },
  skipped: { icon: AlertCircle, colorClass: 'text-zinc-400' },
};

export function StatusIcon({ status, size = 'md', className }: StatusIconProps) {
  // Fallback dla nieznanych statusów
  const config = statusConfig[status] || statusConfig.info;
  const Icon = config.icon;

  return <Icon className={cn(sizeClasses[size], config.colorClass, className)} />;
}
