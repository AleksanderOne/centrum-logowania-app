'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CopyButtonProps {
  text: string;
  label?: string;
  successMessage?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'outline' | 'ghost';
  showLabel?: boolean;
  className?: string;
}

export function CopyButton({
  text,
  label = 'Kopiuj',
  successMessage,
  fullWidth = false,
  size = 'sm',
  variant = 'outline',
  showLabel = true,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (successMessage) {
      toast.success(successMessage);
    } else {
      toast.success('Skopiowano!');
    }
    setTimeout(() => setCopied(false), 2000);
  }, [text, successMessage]);

  // Wersja ikonowa
  if (size === 'icon' || !showLabel) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-6 w-6 transition-all duration-200', className)}
        onClick={handleCopy}
        title={label}
      >
        {copied ? (
          <Check className="w-3 h-3 text-green-500 scale-110" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </Button>
    );
  }

  // Wersja z pełnym labelem
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn(
        'gap-1 text-xs',
        fullWidth && 'flex-1',
        'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50',
        className
      )}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Skopiowano
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          {label}
        </>
      )}
    </Button>
  );
}
