# 🧬 Mutation Testing (Stryker)

Mutation testing to zaawansowana technika weryfikacji jakości testów. Stryker celowo "psuje" (mutuje) kod i sprawdza czy testy wykryją te zmiany.

## 📖 Spis treści

- [Czym jest mutation testing?](#czym-jest-mutation-testing)
- [Uruchomienie lokalne](#uruchomienie-lokalne)
- [Uruchomienie na GitHub Actions](#uruchomienie-na-github-actions)
- [Interpretacja wyników](#interpretacja-wyników)
- [Konfiguracja](#konfiguracja)
- [FAQ](#faq)

---

## Czym jest mutation testing?

### Problem z tradycyjnym coverage

```typescript
// funkcja.ts
export function isAdult(age: number): boolean {
  return age >= 18;
}

// funkcja.test.ts - ZŁY TEST
test('sprawdza dorosłość', () => {
  isAdult(25); // ❌ BEZ asercji!
});
```

**Coverage powie: 100%** ✅ (kod został uruchomiony)  
**Ale test niczego nie sprawdza!** ❌

### Jak działa Stryker?

Stryker **celowo psuje kod** i sprawdza czy testy to wykryją:

```typescript
// Oryginalny kod
return age >= 18;

// Mutant 1: zmiana operatora
return age > 18; // >= → >

// Mutant 2: zmiana wartości
return age >= 0; // 18 → 0

// Mutant 3: negacja
return age < 18; // odwrócono warunek
```

| Mutant     | Testy       | Wynik                               |
| ---------- | ----------- | ----------------------------------- |
| `age > 18` | ❌ Przeszły | 🧟 **Mutant przeżył** - test słaby! |
| `age >= 0` | ✅ Failują  | 💀 **Mutant zabity** - test OK      |

---

## Uruchomienie lokalne

### Szybki start

```bash
# Uruchom mutation testing
npm run test:mutation

# Uruchom i otwórz raport HTML
npm run test:mutation:report
```

### Opcje uruchomienia

```bash
# Mniej procesów (wolniejsze, mniej RAM)
npm run test:mutation -- --concurrency 2

# Więcej procesów (szybsze, więcej RAM)
npm run test:mutation -- --concurrency 8

# Tylko konkretny plik
npx stryker run --mutate "src/components/auth/**/*.tsx"
```

### Czas wykonania

| Projekt                  | Czas       |
| ------------------------ | ---------- |
| Mały (< 50 mutantów)     | ~2-5 min   |
| Średni (50-200 mutantów) | ~5-15 min  |
| Duży (> 200 mutantów)    | ~15-60 min |

> ⚠️ **Uwaga:** Mutation testing jest WOLNY - uruchamiaj okazjonalnie, nie przy każdym uposzie.

---

## Uruchomienie na GitHub Actions

### Automatyczne uruchomienie

Workflow uruchamia się automatycznie:

- **Co niedzielę o 3:00 UTC** (scheduled)

### Ręczne uruchomienie

1. Przejdź do **Actions** w repozytorium GitHub
2. Wybierz workflow **"Mutation Testing (Stryker)"**
3. Kliknij **"Run workflow"**
4. Opcjonalnie zmień:
   - `concurrency` - liczba procesów (2/4/8)
   - `incremental` - tylko zmienione pliki

![GitHub Actions](https://docs.github.com/assets/cb-15465/mw-1440/images/help/actions/actions-select-workflow.webp)

### Gdzie znaleźć wyniki?

1. Po zakończeniu workflow → kliknij na uruchomienie
2. Przejdź do **Summary** - zobaczysz podsumowanie
3. W sekcji **Artifacts** pobierz `mutation-report-xxx`
4. Rozpakuj i otwórz `html/index.html`

---

## Interpretacja wyników

### Mutation Score

```
Mutation Score: 75%
- 120 mutants created
- 90 killed ✅
- 30 survived 🧟
```

| Score       | Ocena        | Znaczenie                           |
| ----------- | ------------ | ----------------------------------- |
| **80-100%** | 🟢 Świetny   | Testy są wysokiej jakości           |
| **60-79%**  | 🟡 Dobry     | Jest miejsce na poprawę             |
| **40-59%**  | 🟠 Słaby     | Wiele testów nie sprawdza poprawnie |
| **0-39%**   | 🔴 Krytyczny | Testy praktycznie nie działają      |

### Typy mutantów

| Typ                       | Przykład             | Co sprawdza           |
| ------------------------- | -------------------- | --------------------- |
| **ArithmeticOperator**    | `+` → `-`            | Operacje matematyczne |
| **EqualityOperator**      | `===` → `!==`        | Porównania            |
| **ConditionalExpression** | `if(x)` → `if(true)` | Warunki               |
| **StringLiteral**         | `"abc"` → `""`       | Stringi               |
| **BlockStatement**        | `{ code }` → `{}`    | Bloki kodu            |

### Co zrobić gdy mutant przeżył?

1. **Otwórz raport HTML** - pokaże dokładnie która mutacja przeżyła
2. **Znajdź plik** - kliknij na plik z przeżyłymi mutantami
3. **Dodaj asercję** - upewnij się że test sprawdza dokładnie tę logikę

**Przykład:**

```typescript
// Mutant przeżył: `x > 5` → `x >= 5`

// ZŁY TEST - nie sprawdza granicy
test('sprawdza x', () => {
  expect(fn(10)).toBe(true);
});

// DOBRY TEST - sprawdza granicę
test('sprawdza x', () => {
  expect(fn(5)).toBe(false); // ← granica
  expect(fn(6)).toBe(true);
});
```

---

## Konfiguracja

### Plik konfiguracyjny

📄 `stryker.config.json`

```json
{
  "testRunner": "command",
  "commandRunner": {
    "command": "npm run test:unit"
  },
  "mutate": ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.test.{ts,tsx}"],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": null
  }
}
```

### Kluczowe opcje

| Opcja              | Opis                                       |
| ------------------ | ------------------------------------------ |
| `mutate`           | Pliki do mutowania (glob patterns)         |
| `thresholds.high`  | Score powyżej = zielony                    |
| `thresholds.low`   | Score poniżej = czerwony                   |
| `thresholds.break` | Score poniżej = fail CI (null = wyłączone) |
| `concurrency`      | Liczba równoległych procesów               |
| `timeoutMS`        | Timeout dla pojedynczego testu             |

### Wykluczanie plików

W `stryker.config.json` w sekcji `mutate`:

```json
"mutate": [
  "src/**/*.ts",
  "!src/**/types/**",      // Wyklucz typy
  "!src/**/constants.ts",  // Wyklucz stałe
  "!src/**/*.d.ts"         // Wyklucz deklaracje
]
```

---

## FAQ

### Czy muszę mieć 100% mutation score?

**Nie.** Realistyczny cel to **70-80%**. Niektóre mutacje są trudne do wykrycia (np. zmiany w logowaniu).

### Mutation testing jest bardzo wolny - co robić?

1. Uruchamiaj tylko na CI (raz dziennie/tygodniowo)
2. Testuj tylko zmienione pliki: `--mutate "src/changed/**"`
3. Zmniejsz concurrency jeśli brakuje RAM

### Dlaczego niektóre mutanty są "No Coverage"?

Oznacza to że kod nie jest pokryty ŻADNYM testem. Najpierw dodaj podstawowy test.

### Czy Stryker wspiera Vitest 4?

⚠️ Oficjalny `@stryker-mutator/vitest-runner` jeszcze nie wspiera Vitest 4. Używamy `command` runnera jako workaround - działa, ale jest wolniejszy.

### Jak często uruchamiać mutation testing?

| Scenariusz    | Częstotliwość   |
| ------------- | --------------- |
| Lokalnie      | Przed ważnym PR |
| CI            | Raz w tygodniu  |
| Przed release | Obowiązkowo     |

---

## 📚 Przydatne linki

- [Stryker Mutator - Dokumentacja](https://stryker-mutator.io/docs/)
- [Mutation Testing - Wikipedia](https://en.wikipedia.org/wiki/Mutation_testing)
- [Stryker Dashboard](https://dashboard.stryker-mutator.io/) - publiczny hosting raportów

---

## 🎯 Podsumowanie komend

```bash
# Lokalne uruchomienie
npm run test:mutation

# Z raportem HTML
npm run test:mutation:report

# Mniej procesów (mniej RAM)
npm run test:mutation -- --concurrency 2

# GitHub Actions
# → Actions → "Mutation Testing (Stryker)" → "Run workflow"
```
