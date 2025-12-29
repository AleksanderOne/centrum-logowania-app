# 👁️ Testy Wizualne (Visual Regression Testing)

Lokalny system wykrywania regresji wizualnej oparty na Playwright.

---

## 🚀 Szybki Start - 3 Komendy

| Komenda | Opis | Kiedy używać |
|---------|------|--------------|
| `npm run test:visual:local` | **Sprawdź regresje** | Po każdej zmianie w UI |
| `npm run test:visual:generate` | **Zaktualizuj snapshoty** | Gdy zmiana jest ZAMIERZONA |
| `npm run test:visual:report` | **Otwórz raport różnic** | Gdy test FAILED |

---

## 📋 Workflow Krok po Kroku

```bash
# 1️⃣ Po zmianach w UI - sprawdź czy są regresje
npm run test:visual:local

# 2️⃣ Jeśli test FAILED - otwórz raport i zobacz różnice
npm run test:visual:report

# 3️⃣a Regresja NIEZAMIERZONA → napraw kod i wróć do kroku 1
# 3️⃣b Zmiana ZAMIERZONA → zaktualizuj baseline:
npm run test:visual:generate

# 4️⃣ Commit nowe snapshoty razem z kodem
git add tests/visual/**/*.png
git commit -m "aktualizacja snapshotów wizualnych"
```

---

## 📊 Struktura Folderów

```
tests/visual/
├── *.visual.spec.ts          # Pliki testowe
├── *-snapshots/              # Bazowe snapshoty (TRZYMAJ W GIT!)
│   ├── *-expected.png        # Oczekiwany wygląd
│   └── *-actual.png          # Aktualny (generowany przy teście)
└── README.md                 # Ten plik
```

---

## 🔍 Co Widzisz Przy Regresji?

Playwright generuje 3 pliki przy różnicy:

| Plik | Opis |
|------|------|
| `xxx-expected.png` | Bazowy snapshot (jak POWINNO wyglądać) |
| `xxx-actual.png` | Aktualny screenshot (jak WYGLĄDA teraz) |
| `xxx-diff.png` | **Różnice podświetlone czerwonym** |

Raport HTML (`npm run test:visual:report`) pokazuje wszystkie różnice wizualnie.

---

## 📋 Pokrycie Testami

### `homepage.visual.spec.ts`
- Strona główna (desktop, mobile, tablet)
- Formularz logowania

### `dashboard.visual.spec.ts`
- Panel Projekty (główny dashboard)
- Panel Logi (audit)
- Panel Użytkownik (profil)
- **3 viewporty:** Desktop (1920x1080), Tablet (1024x768), Mobile (390x844)

### `project-details.visual.spec.ts`
- Szczegóły projektu
- Modale (Integration Tester, Sessions, Quick Connect, Members)

---

## ⚙️ Konfiguracja

Plik: `playwright.visual.config.ts`

```typescript
expect: {
  toHaveScreenshot: {
    threshold: 0.2,        // Tolerancja 20% (można zmniejszyć do 0.1)
    animations: 'disabled', // Wyłączone animacje dla stabilności
  },
},
```

### Dostosowanie Tolerancji

- **0.1 (10%)** - Rygorystyczne, wykrywa małe zmiany
- **0.2 (20%)** - Zbalansowane (obecne ustawienie)
- **0.3 (30%)** - Luźne, toleruje większe różnice

---

## 🐛 Rozwiązywanie Problemów

| Problem | Rozwiązanie |
|---------|-------------|
| Testy niestabilne | Zwiększ `await page.waitForTimeout(500)` |
| Różnice w fontach | Upewnij się, że fonty są załadowane przed screenshot |
| Losowe dane w UI | Mockuj dane lub ignoruj elementy z `testId` |

---

## 📚 Więcej Informacji

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-screenshots)
- [toHaveScreenshot API](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1)
