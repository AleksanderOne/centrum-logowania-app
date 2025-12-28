/* eslint-disable no-console */
/**
 * Setup Code Wizard dla aplikacji demo v3
 * - Dynamiczna konfiguracja
 * - Czyszczenie sesji
 * - Szczegółowe logowanie lokalne i ZDALNE (do pliku logi.txt)
 */
(function () {
  const STORAGE_KEY = 'DEMO_SETUP_CONFIG';

  // State
  let cachedApiUrl = null;

  // --- Logika Konfiguracji ---

  function loadConfig() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (window.DEMO_CONFIG) {
          window.DEMO_CONFIG.clientId = config.slug;
          window.DEMO_CONFIG.authUrl = config.centerUrl || window.location.origin;
          console.log('[SetupWizard] 🚀 Załadowano konfigurację z Setup Code:', config.projectName);
        }
        return config;
      } catch (e) {
        console.error('[SetupWizard] Błąd odczytu konfiguracji', e);
        return null;
      }
    }
    return null;
  }

  const activeConfig = loadConfig();

  // --- UI Wizarda ---

  function createWizardUI() {
    // Style inline
    const style = document.createElement('style');
    style.textContent = `
      #sw-fab {
        position: fixed; bottom: 20px; left: 20px; z-index: 9999;
        background: #2563eb; color: white; border: none; border-radius: 50px;
        padding: 10px 20px; font-family: system-ui, sans-serif; font-weight: bold;
        cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        display: flex; align-items: center; gap: 8px; transition: transform 0.2s;
      }
      #sw-fab:hover { transform: scale(1.05); }
      #sw-modal {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 10000; display: none;
        justify-content: center; align-items: center; backdrop-filter: blur(2px);
      }
      #sw-card {
        background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 420px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); font-family: system-ui, sans-serif;
        color: #1f2937; display: flex; flex-direction: column; max-height: 90vh;
      }
      .dark #sw-card { background: #1f2937; color: #f3f4f6; border: 1px solid #374151; }
      #sw-input {
        width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #d1d5db;
        border-radius: 6px; font-family: monospace; font-size: 14px;
      }
      .dark #sw-input { background: #374151; border-color: #4b5563; color: white; }
      .sw-btn {
        width: 100%; padding: 10px; border-radius: 6px; border: none; cursor: pointer;
        font-weight: 600; margin-top: 8px; transition: background 0.2s;
      }
      .sw-btn-primary { background: #2563eb; color: white; }
      .sw-btn-primary:hover { background: #1d4ed8; }
      .sw-btn-danger { background: #ef4444; color: white; }
      .sw-btn-danger:hover { background: #dc2626; }
      .sw-btn-secondary { background: transparent; border: 1px solid #d1d5db; margin-top: 16px; color: #4b5563; }
      .sw-btn-secondary:hover { background: #f3f4f6; }
      .dark .sw-btn-secondary { border-color: #4b5563; color: #d1d5db; }
      .dark .sw-btn-secondary:hover { background: #374151; }
      #sw-logs {
        margin-top: 16px; padding: 10px; background: #f3f4f6; border-radius: 6px;
        font-size: 11px; font-family: monospace; color: #111827; min-height: 60px;
        max-height: 150px; overflow-y: auto; border: 1px solid #e5e7eb;
      }
      .dark #sw-logs { background: #000; color: #10b981; border-color: #374151; }
      #sw-logs div { margin-bottom: 4px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 2px; }
      .dark #sw-logs div { border-bottom-color: rgba(255,255,255,0.1); }
      /* Modal potwierdzenia resetowania */
      #sw-confirm-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); z-index: 10001; display: none;
        justify-content: center; align-items: center; backdrop-filter: blur(4px);
      }
      #sw-confirm-card {
        background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 360px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); font-family: system-ui, sans-serif;
        text-align: center;
      }
      .dark #sw-confirm-card { background: #1f2937; color: #f3f4f6; border: 1px solid #374151; }
      #sw-confirm-card h3 { margin: 0 0 8px 0; font-size: 1.1rem; color: #dc2626; }
      #sw-confirm-card p { margin: 0 0 20px 0; font-size: 0.875rem; color: #6b7280; }
      .dark #sw-confirm-card p { color: #9ca3af; }
      #sw-confirm-buttons { display: flex; gap: 12px; justify-content: center; }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.innerHTML = `
      <button id="sw-fab">⚙️ Setup Wizard</button>
      <div id="sw-modal">
        <div id="sw-card">
          <h2 style="margin-top:0; font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem;">Konfiguracja Demo</h2>
          <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 16px;">
            Wklej Setup Code z dashboardu, aby automatycznie skonfigurować tę aplikację.
          </p>
          <div id="sw-active-config" style="display: none; background: #ecfdf5; border: 1px solid #10b981; padding: 10px; border-radius: 6px; margin-bottom: 16px; font-size: 0.85rem; color: #065f46;">
            ✅ <strong>Skonfigurowano pomyślnie</strong><br>
            Projekt: <strong id="sw-project-name"></strong><br>
            Slug: <code id="sw-client-id" style="background:rgba(255,255,255,0.5); padding:2px 4px; border-radius:4px;"></code>
          </div>
          <input id="sw-input" placeholder="Wklej kod np. setup_abc..." autocomplete="off">
          <button id="sw-claim-btn" class="sw-btn sw-btn-primary">Pobierz Konfigurację</button>
          <button id="sw-reset-btn" class="sw-btn sw-btn-danger" style="display: none;">Resetuj Konfigurację</button>
          <div id="sw-logs"><div>Gotowy. (Logi wysyłane do logi.txt)</div></div>
          <button id="sw-close-btn" class="sw-btn sw-btn-secondary">Zamknij</button>
        </div>
      </div>
      <!-- Modal potwierdzenia resetowania -->
      <div id="sw-confirm-overlay">
        <div id="sw-confirm-card">
          <h3>⚠️ Potwierdź resetowanie</h3>
          <p>Czy na pewno chcesz usunąć konfigurację i wylogować się z demo?</p>
          <div id="sw-confirm-buttons">
            <button id="sw-confirm-cancel" class="sw-btn sw-btn-secondary" style="margin: 0; flex: 1;">Anuluj</button>
            <button id="sw-confirm-yes" class="sw-btn sw-btn-danger" style="margin: 0; flex: 1;">Resetuj</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    const fab = document.getElementById('sw-fab');
    const modal = document.getElementById('sw-modal');
    const closeBtn = document.getElementById('sw-close-btn');
    const claimBtn = document.getElementById('sw-claim-btn');
    const resetBtn = document.getElementById('sw-reset-btn');
    const input = document.getElementById('sw-input');
    const logs = document.getElementById('sw-logs');
    const activeConfigDiv = document.getElementById('sw-active-config');
    const projectNameEl = document.getElementById('sw-project-name');
    const clientIdEl = document.getElementById('sw-client-id');

    if (activeConfig) {
      activeConfigDiv.style.display = 'block';
      projectNameEl.textContent = activeConfig.projectName;
      clientIdEl.textContent = activeConfig.slug;
      input.style.display = 'none';
      claimBtn.style.display = 'none';
      resetBtn.style.display = 'block';
      logs.innerHTML = '<div>✅ Aplikacja skonfigurowana.</div>';
    }

    // Handlers
    fab.onclick = () => {
      modal.style.display = 'flex';
      log('Otwarto Setup Wizard');
    };
    closeBtn.onclick = () => (modal.style.display = 'none');

    // *** LOGGING SYSTEM ***

    // Remote log sender
    async function sendRemoteLog(msg, data) {
      if (!cachedApiUrl) await detectApiUrl(true); // Silent check
      if (!cachedApiUrl) return;

      // Fire and forget, ale bez errorów w console
      fetch(`${cachedApiUrl}/api/v1/public/debug-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          data: data,
          source: `DEMO (${window.location.port || '80'})`,
        }),
      }).catch(() => {});
    }

    const log = (msg, detail) => {
      const time = new Date().toLocaleTimeString('pl-PL', { hour12: false });
      // UI
      const div = document.createElement('div');
      div.innerHTML = `<span style="opacity:0.6">[${time}]</span> ${msg}`;
      logs.appendChild(div);
      logs.scrollTop = logs.scrollHeight;

      // Console
      if (detail) {
        console.groupCollapsed(`[SetupWizard] ${msg}`);
        console.log(detail);
        console.groupEnd();
      } else {
        console.log(`[SetupWizard] ${msg}`);
      }

      // Server File
      sendRemoteLog(msg, detail);
    };

    // Global Click Listener
    document.addEventListener(
      'click',
      (e) => {
        // Ignoruj kliknięcia wewnątrz własnego wizarda (już logowane przez handlery lub nieistotne)
        if (e.target.closest('#sw-modal') || e.target.closest('#sw-fab')) return;

        let label = e.target.innerText?.substring(0, 20) || e.target.tagName;
        if (e.target.id) label += `#${e.target.id}`;

        // Logujemy kliknięcie w aplikacji
        log(`🖱️ Klik: ${label.replace(/\\n/g, ' ')}`);
      },
      true
    );

    // URL Detection
    async function detectApiUrl(silent = false) {
      if (cachedApiUrl) return cachedApiUrl;
      const candidates = [window.location.origin, 'http://localhost:3000'];

      for (const url of candidates) {
        if (!url || url === 'file://') continue;
        try {
          const res = await fetch(`${url}/api/health`);
          if (res.ok) {
            if (!silent) log(`✅ API OK: ${url}`);
            cachedApiUrl = url;
            return url;
          }
        } catch {
          /* empty */
        }
      }
      return '';
    }

    // Logic
    claimBtn.onclick = async () => {
      const code = input.value.trim();
      if (!code) return log('❌ Błąd: Podaj kod!');

      claimBtn.disabled = true;
      claimBtn.textContent = 'Łączenie...';

      try {
        const baseUrl = await detectApiUrl();
        log(`📡 GET Config from ${baseUrl}`);

        const res = await fetch(`${baseUrl}/api/v1/projects/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setupCode: code }),
        });

        if (!res.ok) {
          const err = await res.json();
          log(`❌ Błąd API: ${res.status}`, err);
          throw new Error(err.error || 'Błąd serwera');
        }

        const config = await res.json();
        log(`✅ Otrzymano config: ${config.projectName}`, config);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

        log('🔄 Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        log(`❌ Exception: ${err.message}`);
        claimBtn.disabled = false;
        claimBtn.textContent = 'Pobierz Konfigurację';
      }
    };

    // Modal potwierdzenia
    const confirmOverlay = document.getElementById('sw-confirm-overlay');
    const confirmCancel = document.getElementById('sw-confirm-cancel');
    const confirmYes = document.getElementById('sw-confirm-yes');

    const showConfirmModal = () => {
      confirmOverlay.style.display = 'flex';
    };
    const hideConfirmModal = () => {
      confirmOverlay.style.display = 'none';
    };

    confirmCancel.onclick = hideConfirmModal;
    confirmOverlay.onclick = (e) => {
      if (e.target === confirmOverlay) hideConfirmModal();
    };

    const doReset = () => {
      log('🧹 Resetowanie...');
      localStorage.removeItem(STORAGE_KEY);
      let removed = 0;
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('auth_')) {
          localStorage.removeItem(key);
          removed++;
        }
      });
      log(`🗑️ Usunięto sesji: ${removed}`);
      log('🔄 Reloading...');
      // Daj czas na wysłanie loga
      setTimeout(() => location.reload(), 500);
    };

    confirmYes.onclick = () => {
      hideConfirmModal();
      doReset();
    };

    resetBtn.onclick = showConfirmModal;
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', createWizardUI);
  else createWizardUI();
})();
