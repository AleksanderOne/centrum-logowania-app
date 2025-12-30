'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ModalContainerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: React.ReactNode;
  titleIcon?: React.ReactNode;
  description?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  useScrollArea?: boolean;
  className?: string;
}

const maxWidthClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
};

export function ModalContainer({
  isOpen,
  onOpenChange,
  trigger,
  title,
  titleIcon,
  description,
  headerExtra,
  children,
  footer,
  maxWidth = 'lg',
  useScrollArea = false,
  className,
}: ModalContainerProps) {
  const content = useScrollArea ? (
    <ScrollArea className="flex-1 min-h-0 pr-2 sm:pr-4">{children}</ScrollArea>
  ) : (
    <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          maxWidthClasses[maxWidth],
          'max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden',
          className
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
            {titleIcon}
            {title}
            {headerExtra}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs sm:text-sm">{description}</DialogDescription>
          )}
        </DialogHeader>

        {content}

        {footer}
      </DialogContent>
    </Dialog>
  );
}
