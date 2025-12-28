'use client';

import { useEffect } from 'react';

/**
 * Globalny tracker kliknięć dla środowiska developerskiego.
 * Wysyła informacje o każdej interakcji użytkownika do serwera (cel: logi.txt).
 */
export function DebugClickTracker() {
  useEffect(() => {
    // Logika działa tylko jeśli backend zaakceptuje request (a backend sprawdza NODE_ENV),
    // ale dla wydajności sprawdzamy też po stronie klienta flagę środowiska (jeśli dostępna).
    // W Next.js process.env.NODE_ENV jest zamieniane na string podczas buildu.
    if (process.env.NODE_ENV !== 'development') return;

    // Pomocnicza funkcja do wysyłania logów
    const sendLog = (message: string, data?: object) => {
      fetch('/api/v1/public/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, source: 'CLA-WEB', data }),
        keepalive: true,
      }).catch(() => {});
    };

    // Logowanie page view przy starcie
    sendLog(`📄 Page View: ${window.location.pathname}`, {
      referrer: document.referrer || 'direct',
      search: window.location.search || undefined,
    });

    // Logowanie przed opuszczeniem strony (odświeżenie, zamknięcie, nawigacja)
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        '/api/v1/public/debug-log',
        JSON.stringify({
          message: `🚪 Opuszczono: ${window.location.pathname}`,
          source: 'CLA-WEB',
          data: { path: window.location.pathname },
        })
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Ignoruj kliknięcia w body czy html (puste tło)
      if (target === document.body || target === document.documentElement) return;

      // Inteligentne wykrywanie etykiety
      let label = '';

      // 1. Sprawdź sam element
      label =
        target.innerText?.trim() ||
        target.getAttribute('aria-label') ||
        target.getAttribute('title') ||
        '';

      // 2. Jeśli to input/textarea/select
      if (!label && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        label = target.placeholder || target.value || target.name;
      }

      // 3. Jeśli pusto, szukaj interaktywnego rodzica (np. klik w ikonę wewnątrz buttona)
      if (!label || label.length > 50) {
        // Jeśli label za długi (cały kontener), szukaj precyzyjniej
        const parentInteractive = target.closest('button, a, input, [role="button"]');
        if (parentInteractive instanceof HTMLElement && parentInteractive !== target) {
          const parentLabel =
            parentInteractive.innerText?.trim() ||
            parentInteractive.getAttribute('aria-label') ||
            parentInteractive.title;
          if (parentLabel) {
            label = `${parentInteractive.tagName}(${parentLabel}) > ${target.tagName}`;
          }
        }
      }

      // Fallback
      if (!label) label = target.tagName;

      // Dodaj ID jeśli jest
      if (target.id) label += `#${target.id}`;

      // Skróć zbyt długie teksty
      label = label.substring(0, 60);

      sendLog(`🖱️ Kliknięto: ${label.replace(/\s+/g, ' ')}`, {
        path: window.location.pathname,
        tag: target.tagName,
        id: target.id,
        className: target.className,
      });
    };

    document.addEventListener('click', handler, true); // Capture phase, żeby złapać wszystko
    return () => {
      document.removeEventListener('click', handler, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return null;
}
