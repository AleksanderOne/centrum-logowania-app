'use client';

import { useEffect } from 'react';

/**
 * Error Boundary - obsługuje błędy i wyświetla przyjazny UI
 */
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 mb-6">
                    <span className="text-4xl">⚠️</span>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Coś poszło nie tak
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.
                </p>

                {error.digest && (
                    <p className="text-xs text-gray-400 mb-6">
                        Kod błędu: {error.digest}
                    </p>
                )}

                <div className="flex flex-col gap-3">
                    <button
                        onClick={reset}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg"
                    >
                        Spróbuj ponownie
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="flex-1 py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                            Zaloguj się
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="flex-1 py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                            Strona główna
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
