export async function register() {
  // Logika tylko dla środowiska Node.js (serwer) i trybu development
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'development') {
    const fs = await import('fs');
    const path = await import('path');

    const logPath = path.join(process.cwd(), 'logi.txt');

    // 1. Czyszczenie na starcie (Clean Start)
    // Kasujemy plik, jeśli istnieje po poprzedniej sesji, aby zacząć z czystą kartą.
    try {
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
      }
    } catch {
      // Ignorujemy błędy przy starcie
    }

    // 2. Handler czyszczący przy zamykaniu (Clean Exit)
    const cleanup = () => {
      try {
        if (fs.existsSync(logPath)) {
          fs.unlinkSync(logPath);
          console.log('\n🗑️  [System] Usunięto logi.txt (zamykanie aplikacji).'); // eslint-disable-line no-console
        }
      } catch (err) {
        console.error('\n❌ [System] Błąd podczas usuwania logi.txt:', err);
      }
      process.exit(0);
    };

    // Rejestrujemy nasłuchiwanie na sygnały zamknięcia
    // Dzięki temu, gdy użytkownik zrobi Ctrl+C, plik zostanie usunięty.
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }
}
