# Testy Wizualne (Visual Regression Testing)

Ten folder zawiera testy wizualne aplikacji, które sprawdzają wygląd interfejsu na różnych urządzeniach i rozdzielczościach.

## 🚀 Szybki Start

### 1. Instalacja Percy.io (Rekomendowane)

```bash
npm install --save-dev @percy/playwright
```

### 2. Konfiguracja Percy.io

1. Utwórz konto na [percy.io](https://percy.io) (darmowe dla open-source)
2. Utwórz nowy projekt
3. Skopiuj `PERCY_TOKEN` z dashboardu
4. Dodaj token do zmiennych środowiskowych:

```bash
# Lokalnie (dodaj do ~/.zshrc lub ~/.bashrc)
export PERCY_TOKEN="your-percy-token-here"

# Lub w pliku .env.local
echo "PERCY_TOKEN=your-percy-token-here" >> .env.local
```

### 3. Uruchamianie Testów

```bash
# Testy wizualne z Percy (wymaga PERCY_TOKEN)
npm run test:visual

# Testy wizualne lokalne (Playwright Visual Comparisons)
npm run test:visual:local
```

## 📋 Dostępne Testy

### `homepage.visual.spec.ts`

- Strona główna (desktop, mobile, tablet)
- Formularz logowania

### `dashboard.visual.spec.ts`

- Dashboard główny
- Lista projektów
- Dialog tworzenia projektu
- Sidebar navigation

### `project-details.visual.spec.ts`

- Szczegóły projektu
- Sekcja kluczy API

## 🎯 Jak Działa Percy.io

1. **Pierwsze uruchomienie**: Tworzy baseline (pierwsze snapshoty)
2. **Kolejne uruchomienia**: Porównuje nowe snapshoty z baseline
3. **Raport**: Pokazuje różnice wizualne
4. **Akceptacja**: Możesz zatwierdzić lub odrzucić zmiany

## 🔧 Konfiguracja

### Ignorowanie Elementów

Możesz oznaczyć elementy, które mają być ignorowane podczas porównań:

```typescript
await percySnapshot(page, 'Dashboard', {
  ignore: ['[data-testid="timestamp"]', '.random-id', '.animations'],
});
```

### Różne Szerokości Ekranu

```typescript
await percySnapshot(page, 'Strona główna', {
  widths: [1920, 1280, 768, 390], // Desktop, Laptop, Tablet, Mobile
});
```

## 📊 Raporty

### Percy.io

- Automatyczny link do raportu po uruchomieniu testów
- Raport dostępny w dashboardzie Percy
- Integracja z GitHub (komentarze w PR)

### Playwright Visual (Lokalne)

- Raporty HTML w folderze `playwright-report/`
- Screenshoty różnic w `test-results/`
- Porównanie side-by-side

## 🐛 Rozwiązywanie Problemów

### Percy nie działa

- Sprawdź czy `PERCY_TOKEN` jest ustawiony
- Sprawdź połączenie z internetem
- Sprawdź czy projekt istnieje w dashboardzie Percy

### Testy są niestabilne

- Zwiększ timeouty: `await page.waitForTimeout(1000)`
- Użyj `waitForLoadState('networkidle')`
- Ignoruj animacje: `animations: 'disabled'`

### Różnice wizualne, które nie powinny być

- Dodaj elementy do `ignore` w `percySnapshot`
- Sprawdź czy nie ma losowych danych
- Upewnij się, że testy są deterministyczne

## 📚 Więcej Informacji

- [Dokumentacja Percy.io](https://docs.percy.io)
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-screenshots)
- [Plan Testowania Wizualnego](../VISUAL_TESTING_PLAN.md)
