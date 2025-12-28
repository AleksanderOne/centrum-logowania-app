/**
 * Wspólna konfiguracja dla wszystkich demo aplikacji
 *
 * Domyślnie pusta, aby wymusić użycie "Setup Wizard" (ikona zębatki w demo).
 * Setup Wizard automatycznie wypełni te dane po wpisaniu Setup Code.
 */

window.DEMO_CONFIG = {
  // Client ID (slug) projektu
  // Zostaw puste, aby testować flow z Setup Wizard.
  // Możesz tu wpisać slug na sztywno, jeśli nie chcesz używać Wizarda.
  clientId: '',

  // Opcjonalne: nadpisz URL serwera auth (domyślnie auto-wykrywany lub z wizarda)
  // authUrl: 'http://localhost:3000',
};

// eslint-disable-next-line no-console
console.log('[DemoConfig] Załadowano konfigurację bazową:', window.DEMO_CONFIG);
