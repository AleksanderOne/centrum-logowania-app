"use client"

import { useTransition } from "react";
import { logoutAllDevices } from "@/actions/logout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, ShieldAlert, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";

export const LogoutButtons = () => {
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
            })
        })
    }

    return (
        <div className="flex flex-col gap-2 w-full">
            <Button variant="default" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" suppressHydrationWarning />
                Wyloguj się (To urządzenie)
            </Button>

            <Button
                variant="destructive"
                onClick={handleGlobalLogout}
                disabled={isPending}
            >
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" suppressHydrationWarning /> : <ShieldAlert className="w-4 h-4 mr-2" suppressHydrationWarning />}
                Wyloguj ze wszystkich urządzeń
            </Button>
        </div>
    )
}
