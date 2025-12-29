'use client';

import { useTransition } from 'react';
import { logoutAllDevices } from '@/actions/logout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LogOut, ShieldAlert, Loader2 } from 'lucide-react';
import { signOut } from 'next-auth/react';

// Przycisk wylogowania z bieżącego urządzenia
// Na mobile tylko ikonka, na tablecie z tekstem
export const LogoutCurrentDevice = () => {
  return (
    <Button
      variant="outline"
      onClick={() => signOut()}
      className="h-9 sm:h-10 px-2.5 sm:px-4 shrink-0"
      title="Wyloguj się z tego urządzenia"
    >
      <LogOut className="w-4 h-4 sm:mr-2 shrink-0" suppressHydrationWarning />
      <span className="hidden sm:inline text-sm">Wyloguj się</span>
    </Button>
  );
};

// Przycisk wylogowania ze wszystkich urządzeń (strefa zagrożenia)
export const LogoutAllDevices = () => {
  const [isPending, startTransition] = useTransition();

  const handleGlobalLogout = () => {
    startTransition(() => {
      logoutAllDevices().then((data) => {
        if (data.success) {
          toast.success(data.success);
          // Po globalnym wylogowaniu, wyloguj też lokalnie
          signOut();
        } else if (data.error) {
          toast.error(data.error);
        }
      });
    });
  };

  return (
    <Button
      variant="destructive"
      onClick={handleGlobalLogout}
      disabled={isPending}
      className="text-xs sm:text-sm h-9 sm:h-10 w-full"
    >
      {isPending ? (
        <Loader2
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin shrink-0"
          suppressHydrationWarning
        />
      ) : (
        <ShieldAlert
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0"
          suppressHydrationWarning
        />
      )}
      <span className="truncate">Wyloguj ze wszystkich urządzeń</span>
    </Button>
  );
};

// Kompatybilność wsteczna - oba przyciski razem
export const LogoutButtons = () => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <LogoutCurrentDevice />
      <LogoutAllDevices />
    </div>
  );
};
