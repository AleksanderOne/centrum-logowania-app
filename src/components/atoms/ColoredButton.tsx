'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type ColorScheme, getColorButtonClasses, buttonAnimations } from '@/lib/color-schemes';

interface ColoredButtonProps {
  color: ColorScheme;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function ColoredButton({
  color,
  icon,
  children,
  onClick,
  fullWidth = true,
  disabled = false,
  className,
  type = 'button',
}: ColoredButtonProps) {
  return (
    <Button
      type={type}
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'gap-1.5',
        fullWidth && 'w-full',
        getColorButtonClasses(color),
        buttonAnimations.scale,
        className
      )}
    >
      {icon}
      {children}
    </Button>
  );
}
