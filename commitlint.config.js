// Konfiguracja commitlint - wymusza konwencję Conventional Commits
// Przykłady poprawnych commitów:
// feat: dodanie nowej funkcji logowania
// fix: naprawa błędu w formularzu
// docs: aktualizacja dokumentacji
// style: formatowanie kodu
// refactor: refaktoryzacja modułu auth
// test: dodanie testów dla komponentu
// chore: aktualizacja zależności

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Typ commita musi być jednym z poniższych
    'type-enum': [
      2,
      'always',
      [
        'feat', // Nowa funkcjonalność
        'fix', // Naprawa błędu
        'docs', // Zmiany w dokumentacji
        'style', // Formatowanie, brak zmian w logice
        'refactor', // Refaktoryzacja kodu
        'test', // Dodanie/modyfikacja testów
        'chore', // Zmiany w build/narzędziach
        'perf', // Optymalizacja wydajności
        'ci', // Zmiany w CI/CD
        'revert', // Cofnięcie zmian
      ],
    ],
    // Opis commita nie może być pusty
    'subject-empty': [2, 'never'],
    // Typ commita nie może być pusty
    'type-empty': [2, 'never'],
    // Maksymalna długość nagłówka
    'header-max-length': [2, 'always', 100],
  },
};
