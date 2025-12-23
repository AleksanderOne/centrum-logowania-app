'use client';

/**
 * Global Error Boundary - ostatnia linia obrony
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="pl">
            <body className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 mb-6">
                        <span className="text-4xl">❌</span>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Wystąpił poważny błąd
                    </h1>
                    <p className="text-gray-600 mb-6">
                        Przepraszamy, aplikacja napotkała nieoczekiwany problem.
                    </p>

                    {error.digest && (
                        <p className="text-xs text-gray-400 mb-6">
                            Kod błędu: {error.digest}
                        </p>
                    )}

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={reset}
                            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg"
                        >
                            Spróbuj ponownie
                        </button>
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="w-full py-3 px-4 border border-gray-200 rounded-lg"
                        >
                            Zaloguj się
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
