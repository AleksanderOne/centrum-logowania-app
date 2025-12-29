# Status Testów Wizualnych Percy

## ✅ Ukończone

### Konfiguracja

- [x] Zainstalowano `@percy/cli` i `@percy/playwright`
- [x] Utworzono `.percyrc` z konfiguracją Percy
- [x] Utworzono `playwright.visual.config.ts` dla testów wizualnych
- [x] Dodano dokumentację w `docs/VISUAL_TESTING.md`
- [x] Poprawiono `package.json` - `test:visual` używa właściwej konfiguracji

### Testy

- [x] Poprawiono importy `percySnapshot` (named import zamiast global)
- [x] Poprawiono opcje Percy (`ignore` → `percyCSS`)
- [x] Usunięto niepoprawny test formularza logowania
- [x] **Testy homepage działają** - 3/3 przeszły ✅
  - Strona główna - Desktop
  - Strona główna - Mobile
  - Strona główna - Tablet

### Infrastruktura

- [x] Poprawiono `loginAsTestUser` - dodano opcjonalny parametr `context`
- [x] Poprawiono `login-form.tsx` - `e2eLogin` dostępne w development mode
- [x] Dodano logowanie serwera Next.js w `global-setup.ts`

## ⚠️ Do naprawienia

### Problem: Logowanie w testach wizualnych Dashboard/Project Details

**Symptom:**

```
[auth][error] CredentialsSignin
Error: page.waitForURL: Test timeout of 30000ms exceeded.
```

**Przyczyna:**

- `e2eLogin` nie jest wywoływana poprawnie w testach wizualnych
- W testach E2E działa bez problemu (11/11 passed)
- Problem może być związany z cache Next.js lub timing

**Możliwe rozwiązania:**

1. Dodać dłuższy timeout dla `waitForFunction` w `auth.ts`
2. Sprawdzić czy `window.e2eLogin` jest rzeczywiście dostępne przed wywołaniem
3. Dodać retry logic dla logowania
4. Użyć innego mechanizmu logowania dla testów wizualnych (np. bezpośrednie ustawienie cookies)

## 📊 Wyniki

### Homepage Tests (3/3 ✅)

- ✅ Strona główna - Desktop (1920px, 1280px)
- ✅ Strona główna - Mobile (390px)
- ✅ Strona główna - Tablet (1024px)

**Percy Build:** https://percy.io/3b461646/web/centrum-logowania-app-d44198dd/builds/45783675

### Dashboard Tests (0/5 ❌)

- ❌ Dashboard - widok główny desktop (timeout logowania)
- ❌ Dashboard - lista projektów (timeout logowania)
- ❌ Dashboard - widok mobile (timeout logowania)
- ❌ Dialog tworzenia projektu (timeout logowania)
- ❌ Dashboard - sidebar (timeout logowania)

### Project Details Tests (0/3 ❌)

- ❌ Szczegóły projektu - Desktop (timeout logowania)
- ❌ Szczegóły projektu - Klucze API (timeout logowania)
- ❌ Szczegóły projektu - Mobile (timeout logowania)

## 🔧 Następne kroki

1. **Debugowanie logowania:**
   - Dodać więcej logów w `loginAsTestUser`
   - Sprawdzić czy `window.e2eLogin` jest dostępne
   - Zwiększyć timeout dla `waitForFunction`

2. **Alternatywne podejście:**
   - Rozważyć użycie Playwright's `storageState` do zapisania sesji
   - Lub użyć bezpośredniego ustawienia cookies zamiast `e2eLogin`

3. **Testy:**
   - Uruchomić testy z większym verbose logging
   - Sprawdzić trace Playwright dla nieudanych testów

## 📝 Notatki

- Percy token jest ustawiony: `web_09c968b6aa1a98cb2b7d0b0a20afe85ace93d65ecad270cc4efc2e21187b779c`
- Testy E2E działają poprawnie (11/11 passed)
- Problem jest specyficzny dla testów wizualnych
- Homepage tests działają bo nie wymagają logowania
