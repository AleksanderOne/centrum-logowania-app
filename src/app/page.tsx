'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Heart,
  Lock,
  Zap,
  MousePointerClick,
  Code2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Globe,
  Users,
  KeyRound,
} from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import { Toaster } from '@/components/ui/sonner';
import { SystemStatus } from '@/components/system-status';
import { Suspense } from 'react';

// Komponent animowanego tła
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-3/4 -right-20 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-500" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

// Sekcja Hero
function HeroSection({ onScrollToLogin }: { onScrollToLogin: () => void }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20">
      <AnimatedBackground />

      <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-green-500/30 to-teal-500/40 rounded-full blur-2xl animate-pulse group-hover:scale-110 transition-transform duration-500" />
            <div className="relative bg-gradient-to-br from-emerald-500 to-green-600 p-5 rounded-3xl shadow-2xl shadow-emerald-500/30 transform hover:scale-105 transition-transform duration-300">
              <ShieldCheck className="w-16 h-16 text-white" suppressHydrationWarning />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>Enterprise-grade Security</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent tracking-tight">
              Centrum Logowania
            </h1>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Centralny system uwierzytelniania dla Twoich aplikacji.
          <span className="text-foreground font-semibold"> Bezpieczny. Szybki. Niezawodny.</span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            size="lg"
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 text-lg px-8"
            onClick={onScrollToLogin}
          >
            Rozpocznij teraz
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-lg px-8"
            onClick={() =>
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Dowiedz się więcej
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 pt-12 max-w-lg mx-auto">
          {[
            { value: '99.9%', label: 'Uptime' },
            { value: '<50ms', label: 'Latencja' },
            { value: '256-bit', label: 'Szyfrowanie' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}

// Sekcja Features
function FeaturesSection() {
  const features = [
    {
      icon: Lock,
      title: 'Maksymalne bezpieczeństwo',
      description:
        'Szyfrowanie end-to-end, ochrona przed atakami brute-force i zaawansowana weryfikacja tożsamości.',
      color: 'from-emerald-500 to-green-600',
    },
    {
      icon: Zap,
      title: 'Błyskawiczna wydajność',
      description: 'Zoptymalizowany system zapewnia natychmiastową autoryzację bez opóźnień.',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: MousePointerClick,
      title: 'Intuicyjny interfejs',
      description: 'Prosty proces logowania w kilka kliknięć. Bez zbędnych komplikacji.',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Code2,
      title: 'Łatwa integracja',
      description: 'Gotowe SDK i REST API. Zintegruj w minuty, nie w dni.',
      color: 'from-purple-500 to-pink-600',
    },
    {
      icon: Globe,
      title: 'Single Sign-On',
      description: 'Jedno logowanie dla wszystkich Twoich aplikacji. Zero haseł do zapamiętania.',
      color: 'from-teal-500 to-cyan-600',
    },
    {
      icon: Users,
      title: 'Zarządzanie użytkownikami',
      description: 'Pełna kontrola nad dostępem, rolami i uprawnieniami użytkowników.',
      color: 'from-rose-500 to-red-600',
    },
  ];

  return (
    <section id="features" className="py-24 px-4 bg-zinc-50/50 dark:bg-zinc-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Wszystko czego potrzebujesz do{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              bezpiecznego uwierzytelniania
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nowoczesne rozwiązanie stworzone z myślą o bezpieczeństwie i wygodzie użytkowników.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="group relative overflow-hidden border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Sekcja How it Works
function HowItWorksSection() {
  const steps = [
    {
      step: 1,
      title: 'Zarejestruj aplikację',
      description: 'Dodaj swoją aplikację do panelu i otrzymaj klucze API.',
      icon: Code2,
    },
    {
      step: 2,
      title: 'Zintegruj SDK',
      description: 'Użyj naszego SDK lub REST API do integracji.',
      icon: KeyRound,
    },
    {
      step: 3,
      title: 'Gotowe!',
      description: 'Twoi użytkownicy mogą bezpiecznie się logować.',
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Integracja w{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              3 prostych krokach
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Szybka konfiguracja bez zbędnych komplikacji.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hidden md:block" />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                {/* Step circle */}
                <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6">
                  <item.icon className="w-8 h-8 text-white" />
                </div>

                {/* Step number badge */}
                <div className="absolute top-0 right-1/2 translate-x-12 -translate-y-2 w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border-2 border-emerald-500 flex items-center justify-center text-sm font-bold text-emerald-600">
                  {item.step}
                </div>

                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Sekcja Login
function LoginSection() {
  return (
    <section
      id="login"
      className="py-24 px-4 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950"
    >
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Zaloguj się</h2>
          <p className="text-muted-foreground">Uzyskaj dostęp do panelu zarządzania</p>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-emerald-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              Bezpieczne logowanie
            </CardTitle>
            <CardDescription>Użyj konta Google, aby uzyskać dostęp do panelu.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-10 w-full animate-pulse bg-muted rounded-md" />}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & info */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-semibold">Centrum Logowania</div>
              <div className="text-sm text-muted-foreground">Bezpieczne uwierzytelnianie</div>
            </div>
          </div>

          {/* Status */}
          <SystemStatus refreshInterval={30000} />

          {/* Credits */}
          <div className="text-sm text-muted-foreground text-center md:text-right">
            <p>
              v{process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'} • Zakodowane z pasji przez{' '}
              <a
                href="https://www.linkedin.com/in/aleksanderjedynak/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium transition-colors"
              >
                AleksanderOne
              </a>{' '}
              <Heart
                className="inline h-3 w-3 text-red-500 fill-red-500 animate-pulse"
                suppressHydrationWarning
              />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Główny komponent strony
export default function Home() {
  const scrollToLogin = () => {
    document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-300">
      <Toaster />

      <HeroSection onScrollToLogin={scrollToLogin} />
      <FeaturesSection />
      <HowItWorksSection />
      <LoginSection />
      <Footer />
    </div>
  );
}
