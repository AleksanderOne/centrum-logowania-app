'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShieldAlert,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Home,
  Mail,
  UserX,
  KeyRound,
  Settings,
  Clock,
  WifiOff,
  Send,
  MessageCircle,
  User,
  Phone,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Suspense, useState } from 'react';
import { ContactFormSchema, type ContactFormData } from '@/schemas';

// Mapowanie kodów błędów Auth.js na polskie komunikaty
const errorMessages: Record<
  string,
  {
    title: string;
    description: string;
    icon: React.ReactNode;
    suggestion: string;
  }
> = {
  Configuration: {
    title: 'Błąd konfiguracji',
    description:
      'Wystąpił problem z konfiguracją serwera uwierzytelniania. Skontaktuj się z administratorem.',
    icon: <Settings className="w-16 h-16" />,
    suggestion: 'Sprawdź czy zmienne środowiskowe są poprawnie skonfigurowane.',
  },
  AccessDenied: {
    title: 'Dostęp zabroniony',
    description: 'Nie masz uprawnień do zalogowania się do tej aplikacji.',
    icon: <UserX className="w-16 h-16" />,
    suggestion: 'Upewnij się, że Twoje konto jest zarejestrowane w systemie.',
  },
  Verification: {
    title: 'Błąd weryfikacji',
    description: 'Link weryfikacyjny wygasł lub jest nieprawidłowy.',
    icon: <Clock className="w-16 h-16" />,
    suggestion: 'Poproś o nowy link weryfikacyjny.',
  },
  OAuthSignin: {
    title: 'Błąd logowania OAuth',
    description: 'Nie udało się rozpocząć procesu logowania przez zewnętrznego dostawcę.',
    icon: <KeyRound className="w-16 h-16" />,
    suggestion: 'Spróbuj ponownie lub użyj innej metody logowania.',
  },
  OAuthCallback: {
    title: 'Błąd odpowiedzi OAuth',
    description: 'Wystąpił problem podczas przetwarzania odpowiedzi od dostawcy logowania.',
    icon: <WifiOff className="w-16 h-16" />,
    suggestion: 'Upewnij się, że zaakceptowałeś wszystkie wymagane uprawnienia.',
  },
  OAuthCreateAccount: {
    title: 'Nie można utworzyć konta',
    description: 'Wystąpił problem podczas tworzenia konta na podstawie danych OAuth.',
    icon: <UserX className="w-16 h-16" />,
    suggestion: 'Twoje konto może już istnieć z innym dostawcą logowania.',
  },
  EmailCreateAccount: {
    title: 'Błąd tworzenia konta',
    description: 'Nie udało się utworzyć konta z podanym adresem email.',
    icon: <Mail className="w-16 h-16" />,
    suggestion: 'Sprawdź czy podany email jest prawidłowy.',
  },
  Callback: {
    title: 'Błąd wywołania zwrotnego',
    description: 'Wystąpił problem podczas przetwarzania żądania uwierzytelnienia.',
    icon: <RefreshCw className="w-16 h-16" />,
    suggestion: 'Spróbuj zalogować się ponownie.',
  },
  OAuthAccountNotLinked: {
    title: 'Konto niepowiązane',
    description:
      'Ten email jest już używany z inną metodą logowania. Zaloguj się oryginalną metodą.',
    icon: <AlertTriangle className="w-16 h-16" />,
    suggestion: 'Użyj tej samej metody logowania, którą użyłeś przy rejestracji.',
  },
  EmailSignin: {
    title: 'Błąd wysyłki email',
    description: 'Nie udało się wysłać emaila z linkiem do logowania.',
    icon: <Mail className="w-16 h-16" />,
    suggestion: 'Sprawdź poprawność adresu email i spróbuj ponownie.',
  },
  CredentialsSignin: {
    title: 'Błędne dane logowania',
    description: 'Podany email lub hasło są nieprawidłowe.',
    icon: <XCircle className="w-16 h-16" />,
    suggestion: 'Sprawdź dane i spróbuj ponownie.',
  },
  SessionRequired: {
    title: 'Wymagane logowanie',
    description: 'Musisz być zalogowany, aby uzyskać dostęp do tej strony.',
    icon: <KeyRound className="w-16 h-16" />,
    suggestion: 'Zaloguj się, aby kontynuować.',
  },
  Default: {
    title: 'Wystąpił błąd',
    description: 'Coś poszło nie tak podczas logowania. Przepraszamy za niedogodności.',
    icon: <ShieldAlert className="w-16 h-16" />,
    suggestion: 'Spróbuj ponownie lub skontaktuj się z administratorem.',
  },
};

// Typ dla błędów walidacji
type ValidationErrors = {
  [K in keyof ContactFormData]?: string;
};

// Komponent formularza kontaktowego
function ContactForm({ errorCode }: { errorCode: string }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Walidacja pojedynczego pola
  const validateField = (name: keyof ContactFormData, value: string): string | undefined => {
    try {
      // Walidacja pojedynczego pola przez Zod
      const fieldSchema = ContactFormSchema.shape[name];
      fieldSchema.parse(value);
      return undefined;
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as { issues: Array<{ message: string }> };
        return zodError.issues[0]?.message;
      }
      return 'Nieprawidłowa wartość';
    }
  };

  // Walidacja całego formularza
  const validateForm = (): boolean => {
    const result = ContactFormSchema.safeParse(formData);

    if (!result.success) {
      const newErrors: ValidationErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ContactFormData;
        if (!newErrors[field]) {
          newErrors[field] = issue.message;
        }
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Walidacja przed wysłaniem
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Parsowanie i sanityzacja danych przez Zod
    const result = ContactFormSchema.safeParse(formData);
    if (!result.success) {
      setIsSubmitting(false);
      return;
    }

    const sanitizedData = result.data;

    // Symulacja wysyłki - tutaj można dodać prawdziwą logikę
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // eslint-disable-next-line no-console
    console.log('Formularz kontaktowy (sanityzowany):', { ...sanitizedData, errorCode });
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Walidacja w czasie rzeczywistym (tylko jeśli pole już miało błąd)
    if (errors[name as keyof ContactFormData]) {
      const error = validateField(name as keyof ContactFormData, value);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Walidacja przy opuszczeniu pola
    const error = validateField(name as keyof ContactFormData, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-green-600 dark:text-green-400">Wiadomość wysłana!</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Dziękujemy za kontakt. Odpowiemy najszybciej jak to możliwe.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Imię i Nazwisko */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Imię <span className="text-red-500">*</span>
          </Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Jan"
            maxLength={50}
            className={`bg-zinc-800/50 border-zinc-700 focus:border-orange-500 focus:ring-orange-500/20 ${
              errors.firstName ? 'border-red-500 focus:border-red-500' : ''
            }`}
            aria-invalid={!!errors.firstName}
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
          />
          {errors.firstName && (
            <p id="firstName-error" className="text-xs text-red-500 flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              {errors.firstName}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium">
            Nazwisko <span className="text-red-500">*</span>
          </Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Kowalski"
            maxLength={50}
            className={`bg-zinc-800/50 border-zinc-700 focus:border-orange-500 focus:ring-orange-500/20 ${
              errors.lastName ? 'border-red-500 focus:border-red-500' : ''
            }`}
            aria-invalid={!!errors.lastName}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
          />
          {errors.lastName && (
            <p id="lastName-error" className="text-xs text-red-500 flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              {errors.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="jan.kowalski@example.com"
          maxLength={100}
          className={`bg-zinc-800/50 border-zinc-700 focus:border-orange-500 focus:ring-orange-500/20 ${
            errors.email ? 'border-red-500 focus:border-red-500' : ''
          }`}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-red-500 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {errors.email}
          </p>
        )}
      </div>

      {/* Telefon */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          Telefon <span className="text-muted-foreground text-xs">(opcjonalny)</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="+48 123 456 789"
          maxLength={20}
          className={`bg-zinc-800/50 border-zinc-700 focus:border-orange-500 focus:ring-orange-500/20 ${
            errors.phone ? 'border-red-500 focus:border-red-500' : ''
          }`}
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? 'phone-error' : undefined}
        />
        {errors.phone && (
          <p id="phone-error" className="text-xs text-red-500 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {errors.phone}
          </p>
        )}
      </div>

      {/* Wiadomość */}
      <div className="space-y-2">
        <Label htmlFor="message" className="text-sm font-medium flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-muted-foreground" />
          Wiadomość <span className="text-red-500">*</span>
          <span className="text-muted-foreground text-xs ml-auto">
            {formData.message.length}/2000
          </span>
        </Label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Opisz swój problem (min. 10 znaków)..."
          rows={4}
          maxLength={2000}
          className={`w-full rounded-md bg-zinc-800/50 border px-3 py-2 text-sm placeholder:text-muted-foreground focus:ring-2 focus:outline-none resize-none ${
            errors.message
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-zinc-700 focus:border-orange-500 focus:ring-orange-500/20'
          }`}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
        />
        {errors.message && (
          <p id="message-error" className="text-xs text-red-500 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {errors.message}
          </p>
        )}
      </div>

      {/* Info o kodzie błędu */}
      <div className="bg-zinc-800/30 rounded-lg p-3 text-xs text-muted-foreground">
        <span className="font-medium">Kod błędu:</span>{' '}
        <code className="bg-zinc-700/50 px-1.5 py-0.5 rounded">{errorCode}</code>
        <span className="ml-2 opacity-70">(zostanie dołączony do wiadomości)</span>
      </div>

      {/* Przycisk wysyłania */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-[2px] transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center justify-center gap-2 rounded-[10px] bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 group-hover:bg-transparent group-disabled:bg-zinc-900">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Wysyłanie...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              Wyślij wiadomość
            </>
          )}
        </span>
      </button>
    </form>
  );
}

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error') || 'Default';

  const errorInfo = errorMessages[errorCode] || errorMessages.Default;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <main className="w-full max-w-lg space-y-8">
        {/* Animowana ikona błędu */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            {/* Pulsujące tło */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/30 via-orange-500/20 to-yellow-500/30 rounded-full blur-2xl animate-pulse scale-150" />

            {/* Pierścienie animowane */}
            <div className="absolute inset-0 -m-4">
              <div
                className="absolute inset-0 border-2 border-red-500/20 rounded-full animate-ping"
                style={{ animationDuration: '2s' }}
              />
              <div
                className="absolute inset-0 border-2 border-orange-500/20 rounded-full animate-ping"
                style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}
              />
            </div>

            {/* Główna ikona */}
            <div className="relative bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 p-6 rounded-3xl shadow-2xl shadow-red-500/25 text-white">
              {errorInfo.icon}
            </div>
          </div>
        </div>

        {/* Karta z informacjami o błędzie */}
        <Card className="border-red-200 dark:border-red-900/50 shadow-xl bg-gradient-to-b from-white to-red-50/50 dark:from-zinc-900 dark:to-red-950/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
              {errorInfo.title}
            </CardTitle>
            <CardDescription className="text-base mt-2">{errorInfo.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wskazówka */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Wskazówka
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {errorInfo.suggestion}
                  </p>
                </div>
              </div>
            </div>

            {/* Kod błędu */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Kod błędu:{' '}
                <code className="bg-muted px-2 py-1 rounded font-mono text-xs">{errorCode}</code>
              </p>
            </div>

            {/* Przyciski akcji */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/"
                className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-[2px] transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25"
              >
                <span className="flex items-center justify-center gap-2 rounded-[10px] bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 group-hover:bg-transparent">
                  <RefreshCw className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                  Spróbuj ponownie
                </span>
              </Link>
              <Link
                href="/"
                className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 p-[2px] transition-all duration-300 hover:shadow-lg hover:shadow-zinc-500/20"
              >
                <span className="flex items-center justify-center gap-2 rounded-[10px] bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 transition-all duration-300 group-hover:bg-zinc-800 group-hover:text-white">
                  <Home className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  Strona główna
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Stopka z formularzem kontaktowym */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Potrzebujesz pomocy?{' '}
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-orange-500 hover:text-orange-400 hover:underline font-medium transition-colors">
                  Skontaktuj się z nami
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <MessageCircle className="w-5 h-5 text-orange-500" />
                    Formularz kontaktowy
                  </DialogTitle>
                  <DialogDescription>
                    Wypełnij formularz, a skontaktujemy się z Tobą najszybciej jak to możliwe.
                  </DialogDescription>
                </DialogHeader>
                <ContactForm errorCode={errorCode} />
              </DialogContent>
            </Dialog>
          </p>
        </div>
      </main>
    </div>
  );
}

// Komponent główny z Suspense dla useSearchParams
export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
