/**
 * Centrum Logowania SDK (Simple & Powerful)
 *
 * Umożliwia zabezpieczenie aplikacji (lub jej części) jedną metodą.
 * Działa jako "Wrapper" - albo pokazuje treść aplikacji (jak użytkownik zalogowany),
 * albo pokazuje ekran zachęcający do logowania.
 */
class CentrumLogowania {
  /**
   * Główna metoda inicjalizująca.
   * @param {Object} config Konfiguracja SDK
   * @param {string} config.clientId ID klienta (slug)
   * @param {string} config.appId ID elementu HTML, który zawiera główną aplikację (chronioną).
   * @param {string} [config.authUrl] Adres serwera logowania (domyślnie http://localhost:3002)
   * @param {function} [config.onLogin] Callback wywoływany po zalogowaniu (otrzymuje obiekt user)
   * @param {Object} [config.style] Opcjonalne style dla wygenerowanego przycisku logowania
   */
  static protect({
    clientId,
    appId,
    authUrl = 'http://localhost:3002',
    onLogin,
    style: _style = {},
  }) {
    const appElement = document.getElementById(appId);
    if (!appElement) {
      console.error(`Błąd SDK: Nie znaleziono elementu o ID: ${appId}`);
      return;
    }

    const sdk = new CentrumLogowaniaInternal(clientId, authUrl);

    // 1. Sprawdź czy wracamy z logowania (URL token)
    sdk.handleCallback();

    // 2. Sprawdź status
    if (sdk.isAuthenticated()) {
      // ZALOGOWANY
      console.warn('SDK: Użytkownik zalogowany.');

      // Pokaż aplikację
      appElement.classList.remove('hidden');
      appElement.style.display = ''; // Reset display if hidden by inline style

      // Wstrzyknij dane użytkownika jeśli zdefiniowano callback
      const user = sdk.getUser();
      if (onLogin && user) {
        onLogin(user);
      }

      // Obsługa wylogowania (szukamy przycisków z atrybutem data-logout)
      sdk.attachLogoutHandlers();
    } else {
      // NIEZALOGOWANY
      console.warn('SDK: Użytkownik niezalogowany.');

      // Ukryj aplikację
      appElement.classList.add('hidden');
      appElement.style.display = 'none';

      // Stwórz i pokaż ekran logowania (Placeholder)
      sdk.renderLoginScreen(appElement.parentNode, appId);
    }

    return sdk;
  }
}

/**
 * Klasa wewnętrzna (Internal) - nie musi być wywoływana bezpośrednio przez użytkownika.
 */
class CentrumLogowaniaInternal {
  constructor(clientId, authUrl) {
    this.clientId = clientId;
    this.authUrl = authUrl;
    this.storageKey = `auth_${clientId}`;
    this.redirectUri = window.location.href.split('?')[0];
  }

  handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem(this.storageKey, token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  getToken() {
    return localStorage.getItem(this.storageKey);
  }

  getUser() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('SDK: Błąd dekodowania tokena', e);
      return null;
    }
  }

  login() {
    window.location.href = `${this.authUrl}/authorize?client_id=${this.clientId}&redirect_uri=${this.redirectUri}`;
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
   * Generuje prosty UI zachęcający do logowania w miejscu gdzie powinna być aplikacja.
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
