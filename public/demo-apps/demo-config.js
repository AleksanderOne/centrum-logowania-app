/**
 * Wspólna konfiguracja dla wszystkich demo aplikacji
 *
 * Zmień CLIENT_ID na slug swojego projektu z dashboardu Centrum Logowania.
 * Wszystkie demo aplikacje automatycznie użyją tej konfiguracji.
 */

window.DEMO_CONFIG = {
  // Client ID (slug) projektu - zmień na swój!
  clientId: 'flashcards-uk61',

  // Opcjonalne: nadpisz URL serwera auth (domyślnie auto-wykrywany)
  // authUrl: 'http://localhost:3000',
};

// eslint-disable-next-line no-console
console.log('[DemoConfig] Załadowano konfigurację:', window.DEMO_CONFIG);
