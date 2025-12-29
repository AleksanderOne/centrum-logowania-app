import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    alias: {
      '@': resolve(__dirname, './src'),
    },
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],

    // Konfiguracja coverage z progami 75%
    coverage: {
      // Dostawca coverage (v8 jest szybszy)
      provider: 'v8',

      // Włącz coverage tylko gdy uruchomione z flagą --coverage
      enabled: false,

      // Formaty raportów
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],

      // Folder z raportami
      reportsDirectory: './coverage',

      // Progi pokrycia - rygorystyczne ale realistyczne 🎯
      thresholds: {
        statements: 40,
        branches: 40,
        functions: 40,
        lines: 40,

        // Monitoruj każdy plik, ale nie failuj przy 100% (wymagane min. 75% dla plików z logiką)
        perFile: false,
      },

      // Pliki do uwzględnienia w coverage
      include: ['src/**/*.{ts,tsx}'],

      // Pliki do wykluczenia z coverage
      exclude: [
        // Pliki testowe
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/tests/**',

        // Konfiguracja i typy
        '**/*.config.{ts,tsx}',
        '**/schemas/**',
        '**/types/**',

        // Pliki Next.js (Server Components - trudne do testowania jednostkowo)
        '**/layout.tsx',
        '**/loading.tsx',
        '**/error.tsx',
        '**/not-found.tsx',
        '**/global-error.tsx',

        // Strony Next.js (testowane przez E2E)
        '**/app/**/page.tsx',
        '**/app/page.tsx',

        // Auth i middleware (trudne do testowania jednostkowo lub testowane przez E2E)
        '**/auth.ts',
        '**/auth.config.ts',
        '**/middleware.ts',
        '**/proxy.ts',

        // Komponenty UI z shadcn (wrapery Radix)
        '**/components/ui/**',

        // Providery i togglery
        '**/theme-provider.tsx',
        '**/mode-toggle.tsx',

        // Biblioteki z logiką systemową
        '**/debug-logger.ts',

        // Szablony/przykłady
        '**/templates/**',

        // Konfiguracja bazy danych
        '**/db/**',

        // Pliki konfiguracyjne serwera i narzędzia debugowania
        '**/instrumentation.ts',
        '**/debug-click-tracker.tsx',
      ],

      // Nie failuj gdy plik nie ma testów (ale raportuj)
      skipFull: false,

      // Czyść poprzednie raporty
      clean: true,
    },
  },
});
