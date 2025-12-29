'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useSyncExternalStore } from 'react';

// Hook do bezpiecznego sprawdzania czy jesteśmy na kliencie (hydration safe)
function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

// Mini wersja przełącznika motywu - tylko ikonki bez tekstu
export function ThemeToggleMini() {
  const { setTheme, theme } = useTheme();
  const hasMounted = useHasMounted();

  if (!hasMounted) {
    return (
      <div className="flex items-center gap-1">
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={theme === 'light' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme('light')}
        title="Jasny motyw"
      >
        <Sun className="h-4 w-4" suppressHydrationWarning />
      </Button>
      <Button
        variant={theme === 'dark' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme('dark')}
        title="Ciemny motyw"
      >
        <Moon className="h-4 w-4" suppressHydrationWarning />
      </Button>
      <Button
        variant={theme === 'system' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme('system')}
        title="Motyw systemowy"
      >
        <Monitor className="h-4 w-4" suppressHydrationWarning />
      </Button>
    </div>
  );
}
