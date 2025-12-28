import fs from 'fs';
import path from 'path';

type LogCategory = 'cla-server' | 'cla-web' | 'demo-web' | 'db';

/**
 * Zapisuje logi do pliku logi.txt w katalogu głównym projektu.
 * Działa TYLKO w trybie development.
 */
export function appendToLogFile(category: LogCategory, message: string, data?: unknown) {
  if (process.env.NODE_ENV !== 'development') return;

  try {
    const timestamp = new Date().toLocaleString('pl-PL');
    const logPath = path.join(process.cwd(), 'logi.txt');

    let content = `[${timestamp}] [${category.toUpperCase()}] ${message}`;

    if (data) {
      try {
        const json = JSON.stringify(data, null, 2);
        // Ogranicz długość logowanych danych, żeby nie zapchać pliku (np. max 2KB)
        const truncatedJson =
          json.length > 5000 ? json.substring(0, 5000) + '... (truncated)' : json;
        content += `\nDATA: ${truncatedJson}`;
      } catch {
        content += `\nDATA: [Circular/Invalid JSON]`;
      }
    }

    content += '\n' + '-'.repeat(40) + '\n';

    // Append file (synchronicznie dla bezpieczeństwa zapisu przy crashu, w dev to ok)
    fs.appendFileSync(logPath, content);
  } catch {
    // Fail silently in logger to avoid loops
    console.error('Failed to write to log file');
  }
}

/**
 * Helper do logowania zdarzeń po stronie serwera API (Server Components / Route Handlers).
 * Używa kategorii 'cla-server'.
 */
export function serverLog(message: string, data?: unknown) {
  appendToLogFile('cla-server', message, data);
}

/**
 * Helper do logowania requestów HTTP (GET, POST, DELETE itd.)
 * Używa kategorii 'cla-server'.
 */
export function httpLog(method: string, path: string, status?: number, duration?: number) {
  const emoji =
    method === 'GET' ? '📥' : method === 'POST' ? '📤' : method === 'DELETE' ? '🗑️' : '📨';
  const statusStr = status ? ` → ${status}` : '';
  const durationStr = duration ? ` (${duration}ms)` : '';
  appendToLogFile('cla-server', `${emoji} ${method} ${path}${statusStr}${durationStr}`);
}
