# 🎨 Instrukcja Konfiguracji Testowania Wizualnego

## Krok 1: Instalacja Zależności

```bash
npm install --save-dev @percy/playwright
```

## Krok 2: Konfiguracja Percy.io

### 2.1. Utwórz konto na Percy.io

1. Przejdź na [https://percy.io](https://percy.io)
2. Zarejestruj się (darmowe dla projektów open-source)
3. Utwórz nowy projekt

### 2.2. Pobierz Token

1. W dashboardzie Percy, przejdź do **Settings** → **Project Settings**
2. Skopiuj **PERCY_TOKEN**

### 2.3. Dodaj Token do Zmiennych Środowiskowych

**Opcja A: Lokalnie (dla testów lokalnych)**

```bash
# Dodaj do ~/.zshrc lub ~/.bashrc
export PERCY_TOKEN="your-percy-token-here"
```

Lub utwórz plik `.env.local` w głównym katalogu projektu:

```bash
echo "PERCY_TOKEN=your-percy-token-here" >> .env.local
```

**Opcja B: W CI/CD (GitHub Actions)**

Dodaj token jako secret w GitHub:
1. Przejdź do **Settings** → **Secrets and variables** → **Actions**
2. Dodaj nowy secret: `PERCY_TOKEN`
3. W workflow dodaj:

```yaml
env:
  PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

## Krok 3: Uruchomienie Testów

### Testy z Percy.io (Rekomendowane)

```bash
npm run test:visual
```

To uruchomi testy wizualne i wyśle snapshoty do Percy.io, gdzie otrzymasz:
- Raport z porównaniami
- Link do dashboardu z różnicami
- Możliwość akceptacji/odrzucenia zmian

### Testy Lokalne (Playwright Visual)

```bash
npm run test:visual:local
```

To uruchomi lokalne testy wizualne używając wbudowanych funkcji Playwright:
- Screenshoty w `test-results/`
- Raporty HTML w `playwright-report/`
- Porównania side-by-side

## Krok 4: Pierwsze Uruchomienie

Przy pierwszym uruchomieniu Percy utworzy **baseline** (pierwszą wersję snapshotów):

1. Uruchom testy: `npm run test:visual`
2. Percy utworzy baseline automatycznie
3. Kolejne uruchomienia będą porównywać z baseline

## Krok 5: Przeglądanie Raportów

### Percy.io Dashboard

1. Po uruchomieniu testów, otrzymasz link do raportu
2. W dashboardzie zobaczysz:
   - Porównania przed/po
   - Różnice wizualne (highlighted)
   - Możliwość akceptacji zmian

### Lokalne Raporty Playwright

```bash
# Otwórz raport HTML
npx playwright show-report
```

## 🔧 Rozwiązywanie Problemów

### Problem: "PERCY_TOKEN is not set"

**Rozwiązanie:**
```bash
export PERCY_TOKEN="your-token-here"
# Lub dodaj do .env.local
```

### Problem: "Cannot find module '@percy/playwright'"

**Rozwiązanie:**
```bash
npm install --save-dev @percy/playwright
```

### Problem: Testy są niestabilne (różne wyniki przy każdym uruchomieniu)

**Rozwiązanie:**
- Zwiększ timeouty: `await page.waitForTimeout(1000)`
- Użyj `waitForLoadState('networkidle')`
- Ignoruj animacje w konfiguracji Percy
- Dodaj elementy do ignorowania (daty, losowe ID)

### Problem: Zbyt wiele różnic wizualnych

**Rozwiązanie:**
- Sprawdź czy nie ma losowych danych
- Dodaj elementy do `ignore` w `percySnapshot`
- Upewnij się, że testy są deterministyczne

## 📚 Więcej Informacji

- [Dokumentacja Percy.io](https://docs.percy.io)
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-screenshots)
- [Plan Testowania Wizualnego](./VISUAL_TESTING_PLAN.md)
- [README Testów Wizualnych](./tests/visual/README.md)

## ✅ Checklist Konfiguracji

- [ ] Zainstalowano `@percy/playwright`
- [ ] Utworzono konto na Percy.io
- [ ] Skonfigurowano `PERCY_TOKEN`
- [ ] Uruchomiono pierwsze testy: `npm run test:visual`
- [ ] Sprawdzono raporty w dashboardzie Percy
- [ ] Skonfigurowano CI/CD (opcjonalnie)

## 🎯 Następne Kroki

1. Dodaj więcej testów wizualnych dla innych widoków
2. Skonfiguruj automatyczne uruchamianie w CI/CD
3. Dodaj komentarze w PR z linkami do raportów Percy
4. Regularnie przeglądaj i akceptuj zmiany wizualne

