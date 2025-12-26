'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="top-right"
      richColors={false}
      expand
      duration={4000}
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-5" />,
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: 'group toast font-medium border-2 shadow-xl !py-4 !px-5',
          title: 'text-sm font-bold',
          description: 'text-sm opacity-90',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          success:
            '!bg-emerald-500/15 dark:!bg-emerald-500/25 !border-emerald-500/40 !text-emerald-700 dark:!text-emerald-200 [&_svg]:!text-emerald-500',
          error:
            '!bg-red-500/15 dark:!bg-red-500/25 !border-red-500/40 !text-red-700 dark:!text-red-200 [&_svg]:!text-red-500',
          warning:
            '!bg-amber-500/15 dark:!bg-amber-500/25 !border-amber-500/40 !text-amber-700 dark:!text-amber-200 [&_svg]:!text-amber-500',
          info: '!bg-blue-500/15 dark:!bg-blue-500/25 !border-blue-500/40 !text-blue-700 dark:!text-blue-200 [&_svg]:!text-blue-500',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'calc(var(--radius) + 4px)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
