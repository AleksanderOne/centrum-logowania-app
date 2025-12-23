"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <Toaster />

      {/* Logo */}
      <div className="absolute top-4 left-4 flex items-center gap-2 font-bold text-xl text-primary">
        <ShieldCheck className="w-8 h-8" suppressHydrationWarning />
        <span>Centrum Logowania</span>
      </div>

      <main className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Witaj ponownie
          </h1>
          <p className="text-muted-foreground">
            Centralny system uwierzytelniania dla Twoich aplikacji.
          </p>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg">
          <CardHeader>
            <CardTitle>Zaloguj się</CardTitle>
            <CardDescription>
              Użyj konta Google, aby uzyskać dostęp do panelu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Status systemu: <span className="text-green-500 font-medium">Operational</span></p>
          <p className="mt-2 text-xs">v1.1.0 • Powered by Next.js & shadcn/ui</p>
        </div>
      </main>
    </div>
  );
}
