'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalFooterProps {
  onClose: () => void;
  closeLabel?: string;
  primaryAction?: {
    label: string;
    loadingLabel?: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    isLoading?: boolean;
  };
  className?: string;
}

export function ModalFooter({
  onClose,
  closeLabel = 'Zamknij',
  primaryAction,
  className,
}: ModalFooterProps) {
  return (
    <div
      className={cn('shrink-0 flex flex-row gap-2 justify-between pt-2 border-t mt-2', className)}
    >
      {primaryAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled || primaryAction.isLoading}
          className="flex-1 sm:flex-none text-xs sm:text-sm"
        >
          {primaryAction.isLoading ? (
            <>
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
              {primaryAction.loadingLabel || primaryAction.label}
            </>
          ) : (
            <>
              {primaryAction.icon && <span className="mr-1 sm:mr-2">{primaryAction.icon}</span>}
              {primaryAction.label}
            </>
          )}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onClose}
        className="flex-1 sm:flex-none text-xs sm:text-sm"
      >
        {closeLabel}
      </Button>
    </div>
  );
}
