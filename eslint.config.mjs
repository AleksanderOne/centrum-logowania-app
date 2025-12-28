import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Wyłącza reguły ESLint konfliktujące z Prettier
  eslintConfigPrettier,
  // Dodatkowe reguły dla lepszej jakości kodu
  {
    rules: {
      // Wymusza używanie const tam gdzie zmienna nie jest modyfikowana
      'prefer-const': 'error',
      // Zabrania używania var
      'no-var': 'error',
      // Wymaga użycia === zamiast ==
      eqeqeq: ['error', 'always'],
      // Zabrania pustych bloków catch
      'no-empty': ['error', { allowEmptyCatch: false }],
      // Ostrzeżenie przy nieużywanych zmiennych (z wyjątkiem tych zaczynających się od _)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Wymaga jawnego typu zwracanego w eksportowanych funkcjach
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Zabrania używania console.log (ostrzeżenie, można użyć console.warn/error)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Ignorowane pliki i katalogi
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '**/.*/**', // Ignoruj ukryte katalogi
    '!**/.github/**', // Ale pozwalaj na lintowanie .github
    '!**/.husky/**', // Oraz .husky (jeśli są tam pliki JS/TS)
  ]),
]);

export default eslintConfig;
