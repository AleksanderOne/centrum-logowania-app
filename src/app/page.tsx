'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Heart } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import { Toaster } from '@/components/ui/sonner';
import { SystemStatus } from '@/components/system-status';
import { Suspense } from 'react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <Toaster />

      <main className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 via-green-500/20 to-teal-500/30 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-2xl shadow-2xl shadow-emerald-500/25">
              <ShieldCheck className="w-12 h-12 text-white" suppressHydrationWarning />
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent tracking-tight">
            Centrum Logowania
          </h2>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Witaj ponownie</h1>
          <p className="text-muted-foreground">
            Centralny system uwierzytelniania dla Twoich aplikacji.
          </p>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg">
          <CardHeader>
            <CardTitle>Zaloguj się</CardTitle>
            <CardDescription>Użyj konta Google, aby uzyskać dostęp do panelu.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-10 w-full animate-pulse bg-muted rounded-md" />}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground space-y-2">
          <SystemStatus refreshInterval={30000} />
          <p className="text-xs">
            v{process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'} • Zakodowane z pasji przez{' '}
            <a
              href="https://www.linkedin.com/in/aleksanderjedynak/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium transition-colors"
            >
              AleksanderOne
            </a>{' '}
            <Heart
              className="inline h-3 w-3 text-red-500 fill-red-500 animate-pulse"
              suppressHydrationWarning
            />
          </p>
        </div>
      </main>
    </div>
  );
}
