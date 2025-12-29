# 🎨 Testy Wizualne z Percy

## Przegląd

Projekt zawiera testy wizualne (visual regression tests) wykorzystujące Percy.io i Playwright.
Percy automatycznie wykrywa zmiany wizualne w UI poprzez porównywanie screenshotów.

## Pliki Testowe

- `tests/visual/homepage.visual.spec.ts` - Testy strony głównej (różne urządzenia)
- `tests/visual/dashboard.visual.spec.ts` - Testy dashboardu (wymagają logowania)
- `tests/visual/project-details.visual.spec.ts` - Testy szczegółów projektu

## Konfiguracja

### 1. Ustaw Percy Token

```bash
export PERCY_TOKEN=web_09c968b6aa1a98cb2b7d0b0a20afe85ace93d65ecad270cc4efc2e21187b779c
```

Lub dodaj do `~/.zshrc`:
```bash
echo 'export PERCY_TOKEN=web_09c968b6aa1a98cb2b7d0b0a20afe85ace93d65ecad270cc4efc2e21187b779c' >> ~/.zshrc
source ~/.zshrc
```

### 2. Sprawdź czy token jest ustawiony

```bash
echo $PERCY_TOKEN
```

## Uruchamianie Testów

### Testy z Percy (wysyła do Percy.io)

```bash
npm run test:visual
```

To uruchomi:
1. Serwer Next.js (globalSetup)
2. Testy Playwright z Percy
3. Wysyła screenshoty do Percy.io
4. Zamyka serwer (globalTeardown)

### Testy lokalne (bez Percy)

```bash
npm run test:visual:local
```

Używa wbudowanych funkcji Playwright do porównań wizualnych (bez wysyłania do Percy).

## Struktura Testów

### Homepage Tests
- ✅ Desktop (1920px, 1280px)
- ✅ Mobile (390px)
- ✅ Tablet (1024px)
- ✅ Formularz logowania

### Dashboard Tests (wymagają logowania)
- ✅ Główny widok desktop
- ✅ Lista projektów
- ✅ Mobile view
- ✅ Dialog tworzenia projektu
- ✅ Sidebar navigation

### Project Details Tests (wymagają logowania + projekt w DB)
- ✅ Desktop view
- ✅ Sekcja kluczy API
- ✅ Mobile view

## Konfiguracja Percy

### `.percyrc`
```yaml
version: 2
snapshot:
  widths: [375, 1280, 1920]
  min-height: 1024
  percy-css: |
    /* Ukryj dynamiczne elementy */
    [data-testid="timestamp"] { visibility: hidden !important; }
```

### `playwright.visual.config.ts`
- Single worker (stabilność)
- Dłuższe timeouty
- Wyłączone screenshoty Playwright (Percy robi własne)

## Workflow

1. **Pierwszy run** - Percy tworzy baseline (bazowe screenshoty)
2. **Kolejne runy** - Percy porównuje z baseline i pokazuje różnice
3. **Review** - Przejdź do Percy.io i zatwierdź/odrzuć zmiany
4. **Approve** - Zaakceptowane zmiany stają się nowym baseline

## Percy Dashboard

Po uruchomieniu testów, link do raportu pojawi się w terminalu:
```
[percy] Percy has finished!
[percy] https://percy.io/your-org/centrum-logowania-app/builds/123
```

## Debugowanie

### Problem: "PERCY_TOKEN is not set"
```bash
export PERCY_TOKEN=web_09c968b6aa1a98cb2b7d0b0a20afe85ace93d65ecad270cc4efc2e21187b779c
```

### Problem: Testy się skipują
Sprawdź czy:
- Serwer działa (globalSetup)
- Użytkownik testowy istnieje w bazie
- Projekt istnieje (dla project-details tests)

### Problem: Percy nie wysyła screenshotów
```bash
# Sprawdź czy @percy/cli jest zainstalowany
npx percy --version

# Reinstaluj jeśli trzeba
npm install --save-dev @percy/cli @percy/playwright
```

## Ignorowanie Elementów

W testach możesz ignorować dynamiczne elementy:

```typescript
await percySnapshot(page, 'Nazwa snapshota', {
  widths: [1920],
  ignore: [
    '[data-testid="timestamp"]',
    '[data-testid="api-key"]',
  ],
});
```

## CI/CD Integration

W GitHub Actions dodaj secret `PERCY_TOKEN` i uruchom:

```yaml
- name: Run Visual Tests
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
  run: npm run test:visual
```

## Najlepsze Praktyki

1. ✅ **Stabilne selektory** - używaj `data-testid` zamiast klas CSS
2. ✅ **Ukrywaj dynamiczne dane** - timestamps, random IDs, API keys
3. ✅ **Czekaj na załadowanie** - `waitForLoadState('networkidle')`
4. ✅ **Single worker** - testy wizualne nie powinny być równoległe
5. ✅ **Testuj kluczowe widoki** - nie każdy pixel, ale ważne ekrany

## Koszty

Percy.io ma darmowy plan:
- 5,000 screenshotów/miesiąc
- Nielimitowane projekty
- Podstawowe features

Dla większych projektów rozważ płatny plan.
