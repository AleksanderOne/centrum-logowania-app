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
    exclude: [...configDefaults.exclude, 'tests/**'],

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

      // Progi pokrycia - 100% dla wszystkich metryk! 🎯
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,

        // Wymagaj 100% pokrycia dla każdego pliku
        perFile: true,
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

        // Server actions i auth (trudne do testowania jednostkowo)
        '**/actions/**',
        '**/auth.ts',
        '**/auth.config.ts',
        '**/middleware.ts',
        '**/proxy.ts',

        // Komponenty UI z shadcn (wrapery Radix)
        '**/components/ui/**',

        // Providery i togglery
        '**/theme-provider.tsx',
        '**/mode-toggle.tsx',

        // Komponenty trudne do testowania (server components, formularze z actions)
        '**/create-project-form.tsx',
        '**/logout-buttons.tsx',
        '**/sidebar-nav.tsx',
        '**/theme-card.tsx',
        '**/dashboard-footer.tsx',

        // Komponenty security (integracja z DB, trudne do unit test)
        '**/security/**',
        '**/audit-logs-viewer.tsx',
        '**/audit-dictionary.tsx',
        '**/project-members.tsx',

        // Komponenty z controlled inputs / z integracją innych komponentów
        '**/projects-container.tsx',
        '**/project-list.tsx',
        '**/quick-connect-manager.tsx',
        '**/integration-tester.tsx',

        // Biblioteki z logiką systemową
        '**/debug-logger.ts',

        // Szablony/przykłady
        '**/templates/**',

        // API routes (testowane przez E2E)
        '**/api/**',

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
