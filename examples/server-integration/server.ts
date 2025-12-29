import http from 'node:http';
import { URL } from 'node:url';
import getPort from 'get-port';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

// ============================================================================
// LOGGING
// ============================================================================
function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const color = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[36m';
  const reset = '\x1b[0m';
  console.log(`${color}[${timestamp}] ${message}${reset}`);
  if (data) console.dir(data, { depth: null, colors: true });
}

// ============================================================================
// CONFIG
// ============================================================================

const VALID_CONFIG_FILE =
  process.env.DEMO_CONFIG_FILE || 'examples/server-integration/demo-config.json';
const CONFIG_FILE = join(process.cwd(), VALID_CONFIG_FILE);
const DEFAULT_CLA_URL = process.env.CLA_URL || 'http://localhost:3000';

let APP_CONFIG = {
  CLIENT_ID: process.env.DEMO_CLIENT_ID || '',
  API_KEY: process.env.DEMO_API_KEY || '',
  CLA_URL: process.env.DEMO_CLA_URL || DEFAULT_CLA_URL,
};

// Load Config
if (existsSync(CONFIG_FILE) && !process.env.DEMO_CLIENT_ID) {
  try {
    const savedConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    APP_CONFIG = { ...APP_CONFIG, ...savedConfig };
    log('INFO', 'Config loaded from file.');
  } catch (_e) {
    /* ignore config load error */
  }
}

function saveConfig(config: Partial<typeof APP_CONFIG>) {
  APP_CONFIG = { ...APP_CONFIG, ...config };
  if (!process.env.DEMO_CLIENT_ID) {
    try {
      writeFileSync(CONFIG_FILE, JSON.stringify(APP_CONFIG, null, 2));
      log('INFO', 'Config saved.');
    } catch (e) {
      log('ERROR', 'Config save failed:', e);
    }
  }
}

function resetConfig() {
  APP_CONFIG.CLIENT_ID = '';
  APP_CONFIG.API_KEY = '';
  if (existsSync(CONFIG_FILE)) unlinkSync(CONFIG_FILE);
  log('WARN', 'Config reset.');
}

// ============================================================================
// HELPERS
// ============================================================================
function getCookies(req: http.IncomingMessage) {
  const list: Record<string, string> = {};
  const rc = req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) list[name] = decodeURI(parts.join('='));
  });
  return list;
}

function getBody(req: http.IncomingMessage): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk.toString()));
    req.on('end', () => {
      if (!body) return resolve({});
      if (req.headers['content-type'] === 'application/json') {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({});
        }
      } else {
        const params = new URLSearchParams(body);
        const result: Record<string, string> = {};
        for (const [key, value] of params.entries()) result[key] = value;
        resolve(result);
      }
    });
  });
}

function html(body: string, title = 'Server-Side Demo') {
  return `
<!DOCTYPE html>
<html lang="pl" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>tailwind.config = { darkMode: 'class' };</script>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; }
        input::placeholder { color: #6b7280; }
        /* Smooth details open */
        details > summary { list-style: none; }
        details > summary::-webkit-details-marker { display: none; }
    </style>
</head>
<body class="bg-black text-gray-100 min-h-screen flex flex-col items-center justify-center p-4">
    <div class="max-w-md w-full bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800 relative overflow-hidden">
        <!-- Top Banner -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-green-500"></div>
        
        <div class="mb-8 text-center">
            <h1 class="text-xl font-bold text-white tracking-tight">Server Side Integration</h1>
            <p class="text-xs text-gray-500 mt-1 font-mono">Demo (Port ${process.env.PORT})</p>
        </div>
        ${body}
    </div>
    
    <div class="mt-8 text-[10px] text-gray-600 font-mono text-center">
        CLA_URL: ${APP_CONFIG.CLA_URL}
    </div>
</body>
</html>`;
}

// ============================================================================
// BUSINESS LOGIC
// ============================================================================
async function claimSetupCode(setupCode: string) {
  const url = `${APP_CONFIG.CLA_URL}/api/v1/projects/claim`;
  log('INFO', `[OUT] POST ${url}`, { setupCode });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setupCode }),
  });

  const data = await res.json();
  if (!res.ok) {
    log('ERROR', `[IN] Claim Failed (${res.status})`, data);
    throw new Error(data.error || res.statusText);
  }
  log('INFO', `[IN] Claim Success`, data);
  return data;
}

async function exchangeCodeForToken(code: string, currentPort: number) {
  const url = `${APP_CONFIG.CLA_URL}/api/v1/token`;
  const body = { code, redirect_uri: `http://localhost:${currentPort}/callback` };

  log('INFO', `[OUT] POST ${url} (Token Exchange)`, body);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': APP_CONFIG.API_KEY },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    log('ERROR', `[IN] Token Exchange Failed (${res.status})`, txt);
    throw new Error(txt);
  }

  const data = await res.json();
  log('INFO', `[IN] Token Received`, { user: data.user, hasToken: !!data.accessToken });
  return data;
}

async function verifySession(userId: string, tokenVersion: number) {
  const url = `${APP_CONFIG.CLA_URL}/api/v1/session/verify`;
  log('INFO', `[OUT] POST ${url} (Verifying Session)`, { userId, tokenVersion });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': APP_CONFIG.API_KEY },
      body: JSON.stringify({ userId, tokenVersion }),
    });

    const data = await res.json();
    log('INFO', `[IN] Verification Result (${res.status}):`, data);

    if (!res.ok) return false;
    return data.valid === true;
  } catch (e) {
    log('ERROR', `[NET] Verification Network Error (Fail-Open)`, e);
    return true;
  }
}

// ============================================================================
// COMPONENTS (Sub-views)
// ============================================================================

const SetupForm = (isEditMode = false) => `
<form method="POST" action="/configure" class="space-y-6 ${isEditMode ? 'bg-gray-800/50 p-4 rounded-lg border border-gray-700 mt-4' : ''}">
    
    ${isEditMode ? '<h3 class="text-sm font-bold text-gray-300 mb-4">Edycja Konfiguracji</h3>' : ''}

    <!-- Redirect URI Info -->
    <div class="bg-blue-900/20 border border-blue-800 rounded-lg p-3 mb-4">
        <p class="text-[10px] text-blue-300 uppercase font-bold mb-1">Wymagany Redirect URI</p>
        <p class="text-xs text-blue-200 mb-1">Dodaj ten adres w Dashboardzie CLA:</p>
        <div class="bg-black/40 px-2 py-1.5 rounded border border-blue-900/50 font-mono text-[11px] text-blue-100 break-all select-all">
            http://localhost:${process.env.PORT}/callback
        </div>
    </div>

    <!-- Quick Connect -->
    <div class="space-y-2">
        <label class="block text-xs font-bold text-gray-500 uppercase">Quick Connect</label>
        <div class="flex gap-2">
            <input type="text" name="setup_code" 
                class="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none transition"
                placeholder="Wklej kod..."
            >
            <button type="submit" name="mode" value="quick" class="bg-green-600 hover:bg-green-500 text-white px-4 rounded-lg text-xs font-bold transition">
                POŁĄCZ
            </button>
        </div>
    </div>

    <div class="relative flex py-2 items-center">
        <div class="flex-grow border-t border-gray-800"></div>
        <span class="flex-shrink-0 mx-4 text-gray-600 text-[10px] uppercase">LUB RĘCZNIE</span>
        <div class="flex-grow border-t border-gray-800"></div>
    </div>

    <!-- Manual -->
    <div class="space-y-3">
        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Client ID</label>
            <input type="text" name="clientId" value="${APP_CONFIG.CLIENT_ID}" 
                class="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none transition"
            >
        </div>
        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
            <input type="password" name="apiKey" value="${APP_CONFIG.API_KEY}" 
                class="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none transition"
            >
        </div>
        <button type="submit" name="mode" value="manual" class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition">
            Zapisz zmiany
        </button>
    </div>
</form>
`;

// ============================================================================
// MAIN SERVER
// ============================================================================

(async () => {
  const PORT = await getPort({ port: [3001, 3002, 3003, 3004, 3005] });
  process.env.PORT = String(PORT);

  const server = http.createServer(async (req, res) => {
    // SAFE RESPONSE HELPER
    const send = (status: number, body?: string, headers: Record<string, string> = {}) => {
      if (res.headersSent) return;
      res.writeHead(status, headers);
      res.end(body);
    };
    const redirect = (loc: string, cookies?: string) => {
      const tempHeaders: Record<string, string> = { Location: loc };
      if (cookies) tempHeaders['Set-Cookie'] = cookies;
      send(302, undefined, tempHeaders);
    };

    try {
      const url = new URL(req.url || '/', `http://localhost:${PORT}`);
      const cookies = getCookies(req);
      const sessionJson = cookies['demo_session'];
      const SESSION = sessionJson ? JSON.parse(sessionJson) : null;
      const IS_CONFIGURED = !!(APP_CONFIG.CLIENT_ID && APP_CONFIG.API_KEY);

      // --- ACTIONS (POST) ---
      if (req.method === 'POST') {
        const body = await getBody(req);

        // 1. CONFIGURATION ACTION
        if (url.pathname === '/configure') {
          try {
            if (body.setup_code) {
              const config = await claimSetupCode(body.setup_code);
              saveConfig({ CLIENT_ID: config.slug, API_KEY: config.apiKey });
            } else {
              saveConfig({ CLIENT_ID: body.clientId, API_KEY: body.apiKey });
            }
            return redirect('/');
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            return send(
              400,
              html(
                `<div class="text-red-500 p-4">Błąd: ${message} <br><a href="/" class="underline text-white">Wróć</a></div>`
              ),
              { 'Content-Type': 'text/html' }
            );
          }
        }

        // 2. LOGOUT ACTION
        if (url.pathname === '/logout') {
          return redirect('/', 'demo_session=; Path=/; Max-Age=0');
        }

        // 3. RESET ACTION
        if (url.pathname === '/reset') {
          resetConfig();
          // Clear session too
          return redirect('/', 'demo_session=; Path=/; Max-Age=0');
        }
      }

      // --- LOGIN CALLBACK (GET) ---
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        if (code) {
          try {
            const data = await exchangeCodeForToken(code, PORT);
            const sessionData = {
              user: data.user,
              accessToken: data.accessToken,
              createdAt: Date.now(),
            };
            return redirect('/', `demo_session=${JSON.stringify(sessionData)}; Path=/; HttpOnly`);
          } catch (e) {
            return send(
              500,
              html(`<div class="text-red-500">Auth Error: ${e} <a href="/">Back</a></div>`),
              { 'Content-Type': 'text/html' }
            );
          }
        }
      }

      // --- LOGIN REDIRECT (GET) ---
      if (url.pathname === '/login-redirect') {
        if (!IS_CONFIGURED) return redirect('/');
        const params = new URLSearchParams({
          client_id: APP_CONFIG.CLIENT_ID,
          redirect_uri: `http://localhost:${PORT}/callback`,
        });
        return redirect(`${APP_CONFIG.CLA_URL}/authorize?${params.toString()}`);
      }

      // ====================================================================
      // RENDER VIEWS (GET /)
      // ====================================================================
      const headers = { 'Content-Type': 'text/html' };

      // ============================================================================
      // STATUS CHECK
      // ============================================================================
      async function checkConnection() {
        try {
          // Sprawdzamy health-check endpoint (lub po prostu root)
          await fetch(`${APP_CONFIG.CLA_URL}/api/health`, { method: 'HEAD' }).catch(() =>
            fetch(`${APP_CONFIG.CLA_URL}/`, { method: 'HEAD' })
          );
          return true;
        } catch (_e) {
          return false;
        }
      }

      // ... inside render loop ...

      // VIEW 1: NOT CONFIGURED (Start Screen)
      if (!IS_CONFIGURED) {
        const isConnected = await checkConnection();

        return send(
          200,
          html(`
                    <div class="text-center mb-6">
                        <div class="text-4xl mb-4">⚙️</div>
                        <h2 class="text-xl font-bold text-white">Konfiguracja Wymagana</h2>
                        <p class="text-gray-400 text-sm">Aby rozpocząć, połącz się z Centrum Logowania.</p>
                    </div>
                    
                    ${
                      !isConnected
                        ? `
                    <div class="bg-red-900/50 border border-red-500/50 rounded-lg p-3 mb-6 text-center">
                        <p class="text-red-200 text-xs font-bold uppercase mb-1">Błąd Połączenia</p>
                        <p class="text-red-300 text-xs">Nie widzę CLA pod adresem: <br><span class="font-mono bg-black/20 px-1 rounded">${APP_CONFIG.CLA_URL}</span></p>
                        <p class="text-red-400 text-[10px] mt-2">Upewnij się, że 'npm run dev' działa na porcie 3000.</p>
                    </div>
                    `
                        : ''
                    }

                    ${SetupForm(false)}
                `),
          headers
        );
      }

      // VIEW 2: LOGGED IN (Dashboard)
      if (SESSION) {
        // Verify session status for display (don't force logout on render to avoid confusing loops, just show status)
        const isValid = await verifySession(SESSION.user.id, SESSION.user.tokenVersion);

        if (!isValid) {
          // FORCE LOGOUT IF SESSION INVALID (Kill Switch)
          log('WARN', 'Kill switch active - invalidating session.');
          return redirect('/', 'demo_session=; Path=/; Max-Age=0');
        }

        return send(
          200,
          html(`
                    <div class="text-center">
                        <div class="inline-block p-3 bg-green-500/10 rounded-full text-green-400 mb-4 border border-green-500/20">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        </div>
                        <h2 class="text-xl font-bold text-white">${SESSION.user.name || 'Użytkownik'}</h2>
                        <p class="text-gray-400 text-sm mb-6">${SESSION.user.email}</p>

                        <div class="bg-black/30 rounded-lg p-4 text-sm font-mono text-gray-300 border border-gray-800 mb-6 space-y-2">
                            <div class="flex justify-between"><span>ID</span><span class="text-gray-500">${SESSION.user.id.substring(0, 8)}...</span></div>
                            <div class="flex justify-between"><span>Role</span><span>${SESSION.user.role}</span></div>
                        </div>

                        <div class="grid grid-cols-2 gap-3 mb-6">
                            <a href="/" class="py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition text-sm font-medium border border-gray-700">↺ Odśwież</a>
                            <form action="/logout" method="POST" class="w-full">
                                 <button type="submit" class="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition text-sm font-medium shadow-lg shadow-blue-900/20">Wyloguj</button>
                            </form>
                        </div>

                        <!-- CONNECTION MANAGEMENT -->
                        <details class="group bg-gray-800/30 rounded-lg border border-gray-800">
                            <summary class="cursor-pointer p-3 text-xs font-bold text-gray-400 uppercase flex justify-between items-center hover:text-gray-200">
                                 <span>⚡ Zarządzanie Połączeniem</span>
                                 <span class="group-open:rotate-180 transition">▼</span>
                            </summary>
                            <div class="p-4 border-t border-gray-800">
                                 ${SetupForm(true)}
                                 
                                 <form action="/reset" method="POST" class="mt-6 pt-6 border-t border-gray-800">
                                    <button type="submit" class="w-full text-red-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-2 py-2 rounded hover:bg-red-900/20 transition">
                                        <span>🗑️</span> USUŃ KONFIGURACJĘ I WYLOGUJ
                                    </button>
                                 </form>
                            </div>
                        </details>
                    </div>
                `),
          headers
        );
      }

      // VIEW 3: NOT LOGGED IN (Configured, Login Screen)
      // Has config, but no session
      return send(
        200,
        html(`
                <div class="text-center">
                     <div class="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6 border border-gray-700 shadow-xl">
                        <span class="text-3xl">🔐</span>
                    </div>
                    <h2 class="text-xl font-bold text-white mb-2">Gotowy do logowania</h2>
                    <div class="bg-gray-800/50 rounded px-2 py-1 inline-block text-[10px] font-mono text-green-400 border border-green-900/40 mb-8">
                        App Configured • ${APP_CONFIG.CLIENT_ID}
                    </div>

                    <a href="/login-redirect" class="block w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg mb-8 shadow-lg shadow-blue-900/30 transition transform hover:scale-[1.02]">
                        Zaloguj przez Centrum
                    </a>

                    <!-- CONNECTION MANAGEMENT -->
                    <details class="group bg-gray-800/30 rounded-lg border border-gray-800 text-left">
                        <summary class="cursor-pointer p-3 text-xs font-bold text-gray-400 uppercase flex justify-between items-center hover:text-gray-200">
                                <span>⚡ Ustawienia Połączenia</span>
                                <span class="group-open:rotate-180 transition">▼</span>
                        </summary>
                        <div class="p-4 border-t border-gray-800">
                                ${SetupForm(true)}
                                
                                <form action="/reset" method="POST" class="mt-6 pt-6 border-t border-gray-800 text-center">
                                <button type="submit" class="text-red-400 hover:text-red-300 text-xs font-bold transition">
                                    RESETUJ CAŁĄ KONFIGURACJĘ
                                </button>
                                </form>
                        </div>
                    </details>
                </div>
            `),
        headers
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log('ERROR', 'Unhandled Handler Error:', message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<pre style="color:red">Internal Server Error: ${message}</pre>`);
      }
    }
  });

  server.listen(PORT, () => {
    console.log(`\n🚀 DEMO: http://localhost:${PORT}\n`);
  });
})();
