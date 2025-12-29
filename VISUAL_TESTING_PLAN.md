# Plan Testowania Wizualnego (Visual Regression Testing)

## 📋 Przegląd

Ten dokument opisuje strategię testowania wizualnego aplikacji, która pozwala na:
- ✅ Sprawdzanie wyglądu aplikacji na różnych urządzeniach i rozdzielczościach
- ✅ Porównywanie wyglądu przed i po zmianach
- ✅ Generowanie raportów z różnicami wizualnymi
- ✅ Automatyczne wykrywanie regresji wizualnych

## 🛠️ Wybrane Narzędzia

### 1. **Percy.io** (Rekomendowane - Główne rozwiązanie)

**Dlaczego Percy?**
- ✅ Darmowy plan dla projektów open-source i małych projektów
- ✅ Łatwa integracja z Playwright
- ✅ Zaawansowane raporty z porównaniami przed/po
- ✅ Automatyczne zarządzanie snapshotami
- ✅ Wsparcie dla wielu przeglądarek i urządzeń
- ✅ Integracja z CI/CD (GitHub Actions)
- ✅ Nie wymaga podpisywania aplikacji

**Jak działa:**
1. Testy robią screenshoty kluczowych widoków
2. Percy porównuje je z wcześniejszymi wersjami (baseline)
3. Generuje raporty z różnicami
4. Pozwala na akceptację lub odrzucenie zmian

**Limity darmowego planu:**
- 5,000 snapshots/miesiąc
- Nieograniczone projekty
- Wsparcie społeczności

### 2. **Playwright Visual Comparisons** (Alternatywa - Lokalne)

**Dlaczego Playwright Visual?**
- ✅ Wbudowane w Playwright (już masz w projekcie)
- ✅ Całkowicie darmowe i lokalne
- ✅ Pełna kontrola nad snapshotami
- ✅ Działa offline

**Ograniczenia:**
- Wymaga ręcznego zarządzania snapshotami
- Mniej zaawansowane raporty niż Percy
- Trudniejsze porównywanie wielu urządzeń jednocześnie

## 📱 Urządzenia i Rozdzielczości do Testowania

### Desktop
- **Desktop Chrome** - 1920x1080 (Full HD)
- **Desktop Firefox** - 1920x1080
- **Desktop Safari** - 1920x1080

### Tablet
- **iPad Pro** - 1024x1366 (portrait)
- **iPad Air** - 820x1180 (portrait)

### Mobile
- **iPhone 14 Pro** - 390x844
- **iPhone SE** - 375x667
- **Samsung Galaxy S21** - 360x800

## 🎯 Kluczowe Widoki do Testowania

### 1. Strona Główna (`/`)
- Hero section
- Formularz logowania
- Footer

### 2. Dashboard (`/dashboard`)
- Lista projektów
- Karty projektów
- Sidebar navigation
- Header z użytkownikiem

### 3. Szczegóły Projektu (`/dashboard/projects/[id]`)
- Informacje o projekcie
- Klucze API
- Lista sesji
- Statystyki

### 4. Formularze
- Tworzenie projektu
- Edycja projektu
- Dialogi potwierdzenia

### 5. Responsywność
- Przejście z desktop na mobile
- Menu hamburger na mobile
- Układy grid/list na różnych rozdzielczościach

## 🚀 Implementacja

### Krok 1: Instalacja Percy.io

```bash
npm install --save-dev @percy/playwright
```

### Krok 2: Konfiguracja

1. Utwórz konto na [percy.io](https://percy.io)
2. Dodaj `PERCY_TOKEN` do zmiennych środowiskowych
3. Skonfiguruj projekt w `playwright.config.ts`

### Krok 3: Tworzenie Testów Wizualnych

Testy wizualne będą w folderze `tests/visual/` i będą używać funkcji `percySnapshot()`.

### Krok 4: Uruchamianie Testów

```bash
# Testy wizualne z Percy
npm run test:visual

# Testy wizualne lokalne (Playwright)
npm run test:visual:local
```

## 📊 Raportowanie

### Percy.io
- Automatyczne raporty po każdym uruchomieniu testów
- Link do raportu w CI/CD
- Porównanie przed/po zmianami
- Możliwość akceptacji zmian wizualnych

### Playwright Visual
- Lokalne raporty HTML
- Screenshoty różnic w folderze `test-results/`
- Porównanie side-by-side

## 🔄 Workflow CI/CD

1. **Pull Request** → Uruchom testy wizualne
2. **Percy** → Porównaj z baseline
3. **Raport** → Wyświetl różnice w PR
4. **Review** → Zespół przegląda zmiany
5. **Akceptacja** → Zatwierdź lub odrzuć zmiany

## 📝 Best Practices

1. **Stabilność testów:**
   - Czekaj na pełne załadowanie przed screenshotem
   - Używaj `waitForLoadState('networkidle')`
   - Unikaj animacji i losowych elementów

2. **Selekcja widoków:**
   - Testuj kluczowe user flows
   - Nie testuj każdego możliwego widoku
   - Skup się na komponentach UI

3. **Maintenance:**
   - Regularnie aktualizuj baseline
   - Usuwaj niepotrzebne snapshots
   - Dokumentuj zmiany wizualne

4. **Ignorowanie elementów:**
   - Daty/czasy
   - Losowe ID
   - Animacje
   - Reklamy (jeśli są)

## 🎨 Ignorowanie Elementów w Percy

Możesz oznaczyć elementy do ignorowania podczas porównań:

```typescript
await percySnapshot(page, 'dashboard', {
  ignore: [
    '[data-testid="timestamp"]',
    '.random-id',
    '.animations'
  ]
});
```

## 📈 Metryki i Monitoring

- Liczba zmian wizualnych w czasie
- Czas wykonania testów wizualnych
- Procent akceptowanych zmian
- Najczęściej zmieniane komponenty

## 🔗 Przydatne Linki

- [Percy.io Documentation](https://docs.percy.io)
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-screenshots)
- [Percy + Playwright Integration](https://docs.percy.io/docs/playwright)

## ⚠️ Uwagi

- Percy wymaga połączenia z internetem
- Playwright Visual działa całkowicie lokalnie
- Oba narzędzia można używać równolegle
- Percy jest lepsze dla zespołów i CI/CD
- Playwright Visual jest lepsze dla szybkich lokalnych testów

