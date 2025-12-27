/**
 * Centrum Logowania SDK v2.1 (OAuth2 Authorization Code Flow)
 *
 * Umożliwia zabezpieczenie aplikacji (lub jej części) jedną metodą.
 * Działa jako "Wrapper" - albo pokazuje treść aplikacji (jak użytkownik zalogowany),
 * albo pokazuje ekran zachęcający do logowania.
 *
 * AUTOMATYCZNE WYKRYWANIE URL:
 * SDK automatycznie wykrywa adres Centrum Logowania na podstawie:
 * 1. Atrybutu data-auth-url na tagu <script>
 * 2. URL skąd SDK jest ładowany (jeśli z /sdk/auth.js)
 * 3. Parametru authUrl w konfiguracji (fallback)
 *
 * FLOW:
 * 1. Użytkownik klika "Zaloguj się"
 * 2. Przekierowanie do /authorize z client_id i redirect_uri
 * 3. Po zalogowaniu, przekierowanie z powrotem z ?code=XXX
 * 4. SDK wymienia kod na dane użytkownika przez /api/v1/public/token
 * 5. Dane użytkownika zapisywane w localStorage
 */

// Automatyczne wykrywanie URL serwera auth
const _detectAuthUrl = () => {
  // 1. Sprawdź atrybut data-auth-url na tagu script
  const currentScript = document.currentScript;
  if (currentScript) {
    const dataUrl = currentScript.getAttribute('data-auth-url');
    if (dataUrl) {
      return dataUrl.replace(/\/$/, ''); // Usuń trailing slash
    }

    // 2. Wykryj z URL skryptu (np. http://localhost:3000/sdk/auth.js)
    const scriptSrc = currentScript.src;
    if (scriptSrc && scriptSrc.includes('/sdk/auth.js')) {
      const url = new URL(scriptSrc);
      return `${url.protocol}//${url.host}`;
    }
  }

  // 3. Fallback - szukaj wszystkich tagów script
  const scripts = document.querySelectorAll('script[src*="/sdk/auth.js"]');
  for (const script of scripts) {
    const dataUrl = script.getAttribute('data-auth-url');
    if (dataUrl) return dataUrl.replace(/\/$/, '');

    try {
      const url = new URL(script.src);
      return `${url.protocol}//${url.host}`;
    } catch {
      // Ignoruj błędy parsowania
    }
  }

  // 4. Ostateczny fallback - ten sam origin co strona
  console.warn(
    '[CentrumLogowania] Nie wykryto URL serwera auth. Używam bieżącego origin:',
    window.location.origin
  );
  return window.location.origin;
};

// Wykryj URL przy ładowaniu SDK
const _AUTO_AUTH_URL = _detectAuthUrl();
console.log('[CentrumLogowania] Auto-detected auth URL:', _AUTO_AUTH_URL);

class CentrumLogowania {
  /**
   * Główna metoda inicjalizująca.
   * @param {Object} config Konfiguracja SDK
   * @param {string} config.clientId ID klienta (slug projektu)
   * @param {string} config.appId ID elementu HTML, który zawiera główną aplikację (chronioną).
   * @param {string} [config.authUrl] Adres serwera logowania (automatycznie wykrywany jeśli nie podano)
   * @param {function} [config.onLogin] Callback wywoływany po zalogowaniu (otrzymuje obiekt user)
   * @param {Object} [config.style] Opcjonalne style dla wygenerowanego przycisku logowania
   */
  static protect({ clientId, appId, authUrl, onLogin, style: _style = {} }) {
    const appElement = document.getElementById(appId);
    if (!appElement) {
      console.error(`[CentrumLogowania] Nie znaleziono elementu o ID: ${appId}`);
      return;
    }

    // Użyj automatycznie wykrytego URL jeśli nie podano
    const finalAuthUrl = authUrl || _AUTO_AUTH_URL;
    console.log('[CentrumLogowania] Using auth URL:', finalAuthUrl);

    const sdk = new CentrumLogowaniaInternal(clientId, finalAuthUrl);

    // 1. Obsłuż callback z kodem autoryzacyjnym
    sdk.handleCallback().then((handled) => {
      if (handled) {
        // Kod został wymieniony, przeładuj stronę
        return;
      }

      // 2. Sprawdź status
      if (sdk.isAuthenticated()) {
        // ZALOGOWANY
        console.log('[CentrumLogowania] Użytkownik zalogowany.');

        // Pokaż aplikację
        appElement.classList.remove('hidden');
        appElement.style.display = '';

        // Wstrzyknij dane użytkownika jeśli zdefiniowano callback
        const user = sdk.getUser();
        if (onLogin && user) {
          onLogin(user);
        }

        // Obsługa wylogowania
        sdk.attachLogoutHandlers();
      } else {
        // NIEZALOGOWANY
        console.log('[CentrumLogowania] Użytkownik niezalogowany.');

        // Ukryj aplikację
        appElement.classList.add('hidden');
        appElement.style.display = 'none';

        // Stwórz i pokaż ekran logowania
        sdk.renderLoginScreen(appElement.parentNode, appId);
      }
    });

    return sdk;
  }

  /**
   * Zwraca automatycznie wykryty URL serwera auth
   */
  static getAuthUrl() {
    return _AUTO_AUTH_URL;
  }
}

/**
 * Klasa wewnętrzna - obsługuje logikę OAuth2
 */
class CentrumLogowaniaInternal {
  constructor(clientId, authUrl) {
    this.clientId = clientId;
    this.authUrl = authUrl;
    this.storageKey = `auth_${clientId}`;
    this.redirectUri = window.location.href.split('?')[0].split('#')[0];
  }

  /**
   * Obsługuje callback z kodem autoryzacyjnym
   * @returns {Promise<boolean>} true jeśli kod został obsłużony
   */
  async handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (!code) {
      return false;
    }

    console.log('[CentrumLogowania] Otrzymano kod autoryzacyjny, wymieniam na dane użytkownika...');

    try {
      // Wymień kod na dane użytkownika przez publiczny endpoint
      const response = await fetch(`${this.authUrl}/api/v1/public/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[CentrumLogowania] Błąd wymiany kodu:', error);
        // Wyczyść URL z kodem
        window.history.replaceState({}, document.title, window.location.pathname);
        return false;
      }

      const data = await response.json();
      console.log('[CentrumLogowania] Zalogowano pomyślnie:', data.user?.email);

      // Zapisz dane użytkownika
      localStorage.setItem(this.storageKey, JSON.stringify(data.user));

      // Wyczyść URL z kodem i przeładuj
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.reload();

      return true;
    } catch (error) {
      console.error('[CentrumLogowania] Błąd podczas wymiany kodu:', error);
      window.history.replaceState({}, document.title, window.location.pathname);
      return false;
    }
  }

  isAuthenticated() {
    return !!this.getUser();
  }

  getUser() {
    const data = localStorage.getItem(this.storageKey);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('[CentrumLogowania] Błąd parsowania danych użytkownika:', e);
      return null;
    }
  }

  login() {
    const authorizeUrl = `${this.authUrl}/authorize?client_id=${encodeURIComponent(this.clientId)}&redirect_uri=${encodeURIComponent(this.redirectUri)}`;
    console.log('[CentrumLogowania] Przekierowuję do:', authorizeUrl);
    window.location.href = authorizeUrl;
  }

  logout() {
    localStorage.removeItem(this.storageKey);
    window.location.reload();
  }

  attachLogoutHandlers() {
    document.querySelectorAll('[data-auth-logout]').forEach((btn) => {
      btn.addEventListener('click', () => this.logout());
    });
  }

  /**
   * Generuje prosty UI zachęcający do logowania
   */
  renderLoginScreen(parentElement, elementIdToInsertBefore) {
    // Sprawdź czy już nie wygenerowaliśmy
    if (document.getElementById('cl-login-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'cl-login-wrapper';
    wrapper.className =
      'flex flex-col items-center justify-center p-8 text-center space-y-4 animate-in fade-in zoom-in duration-300';
    wrapper.style.minHeight = '200px';

    // Ikona kłódki/tarczy
    wrapper.innerHTML = `
            <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-2">
                <svg class="w-8 h-8 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Dostęp wymagany</h3>
            <p class="text-gray-500 dark:text-gray-400 max-w-xs">Ta treść jest dostępna tylko dla zalogowanych użytkowników.</p>
        `;

    const btn = document.createElement('button');
    btn.innerText = 'Zaloguj się przez Centrum';
    btn.className =
      'mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm';
    btn.onclick = () => this.login();

    wrapper.appendChild(btn);

    // Znajdź element referencyjny
    const ref = document.getElementById(elementIdToInsertBefore);
    parentElement.insertBefore(wrapper, ref);
  }
}

// Eksport globalny
window.CentrumLogowania = CentrumLogowania;
