'use client';

import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export function ThemeCard() {
  const { setTheme, theme } = useTheme();
  const hasMounted = useHasMounted();

  if (!hasMounted) {
    return (
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Wygląd aplikacji</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Ładowanie ustawień...</CardDescription>
        </CardHeader>
        <CardContent className="h-20 sm:h-24 p-4 sm:p-6 pt-0 sm:pt-0" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg">Wygląd aplikacji</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Wybierz preferowany motyw interfejsu.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-1.5 sm:gap-2 p-4 sm:p-6 pt-0 sm:pt-0">
        <Button
          variant={theme === 'light' ? 'default' : 'outline'}
          className="flex flex-col gap-1 sm:gap-2 h-auto py-2.5 sm:py-4 px-2 sm:px-4"
          onClick={() => setTheme('light')}
        >
          <Sun className="h-5 w-5 sm:h-6 sm:w-6" suppressHydrationWarning />
          <span className="font-medium text-xs sm:text-sm">Jasny</span>
        </Button>
        <Button
          variant={theme === 'dark' ? 'default' : 'outline'}
          className="flex flex-col gap-1 sm:gap-2 h-auto py-2.5 sm:py-4 px-2 sm:px-4"
          onClick={() => setTheme('dark')}
        >
          <Moon className="h-5 w-5 sm:h-6 sm:w-6" suppressHydrationWarning />
          <span className="font-medium text-xs sm:text-sm">Ciemny</span>
        </Button>
        <Button
          variant={theme === 'system' ? 'default' : 'outline'}
          className="flex flex-col gap-1 sm:gap-2 h-auto py-2.5 sm:py-4 px-2 sm:px-4"
          onClick={() => setTheme('system')}
        >
          <Monitor className="h-5 w-5 sm:h-6 sm:w-6" suppressHydrationWarning />
          <span className="font-medium text-xs sm:text-sm">System</span>
        </Button>
      </CardContent>
    </Card>
  );
}
