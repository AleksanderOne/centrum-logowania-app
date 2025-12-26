'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Strona logowania przez SSO
 *
 * DOSTOSUJ:
 * - Zmień wygląd według designu Twojej aplikacji
 * - Zaktualizuj domyślną stronę po logowaniu (returnTo)
 */

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  // Obliczamy błąd bezpośrednio z searchParams bez użycia setState w useEffect
  const errorParam = searchParams.get('error');
  const errorMessages: Record<string, string> = {
    missing_code: 'Brak kodu autoryzacji. Spróbuj ponownie.',
    invalid_code: 'Kod autoryzacji jest nieprawidłowy lub wygasł.',
    blocked: 'Twoje konto zostało zablokowane.',
    server_error: 'Błąd serwera. Spróbuj ponownie później.',
  };
  const error = errorParam ? errorMessages[errorParam] || 'Wystąpił nieznany błąd.' : '';

  const handleSSOLogin = () => {
    setIsLoading(true);

    const baseUrl = window.location.origin;
    const returnTo = searchParams.get('callbackUrl') || '/dashboard'; // ZMIEŃ domyślną stronę

    // Zapisz stronę docelową
    document.cookie = `sso-return-url=${encodeURIComponent(returnTo)}; path=/; max-age=300; SameSite=Lax`;

    const callbackUrl = encodeURIComponent(`${baseUrl}/api/auth/sso-callback`);
    const centerUrl = process.env.NEXT_PUBLIC_SSO_CENTER_URL;
    const clientId = process.env.NEXT_PUBLIC_SSO_CLIENT_ID;

    window.location.href = `${centerUrl}/authorize?client_id=${clientId}&redirect_uri=${callbackUrl}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        {/* Logo/Tytuł - DOSTOSUJ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-4">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zaloguj się</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Zaloguj się, aby kontynuować</p>
        </div>

        {/* Błąd */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Przycisk logowania */}
        <button
          onClick={handleSSOLogin}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
        >
          {isLoading ? 'Przekierowuję...' : 'Zaloguj przez Centrum'}
        </button>

        {/* Info */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Logowanie odbywa się przez Centrum Logowania z uwierzytelnianiem Google.
        </p>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
