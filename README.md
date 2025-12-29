# 🛡️ Centrum Logowania (Identity Provider)

Profesjonalny, scentralizowany system zarządzania tożsamością i dostępem (IAM), zaprojektowany jako "Source of Truth" dla wielu zewnętrznych aplikacji. System działa jako Identity Provider (IdP), umożliwiając logowanie w modelu SSO (Single Sign-On) oraz granularne zarządzanie uprawnieniami per projekt.

System łączy bezpieczeństwo klasy enterprise (Kill Switch, Audit Logs, Rate Limiting) z nowoczesnym stosem technologicznym i łatwością integracji (Quick Connect).

---

## 📋 Spis Treści

1. [Architektura Systemu](#-architektura-systemu)
2. [Technologie (Tech Stack)](#--technologie-tech-stack)
3. [Model Danych (Schema)](#-model-danych-db-schema)
4. [Instalacja i Konfiguracja](#-instalacja-i-konfiguracja)
5. [Bezpieczeństwo](#-bezpieczeństwo)
6. [Dokumentacja API](#-dokumentacja-api)
7. [Integracja (Quick Connect)](#-integracja-quick-connect)
8. [Dema i Przykłady Integracji](#-dema-i-przykłady-integracji)
9. [Dashboard Zarządzania](#-dashboard-zarządzania)
10. [Testy Mutacyjne](#-testy-mutacyjne-mutation-testing)
11. [Testowanie Wizualne](#-testowanie-wizualne-visual-regression-testing)

---

## 🏗️ Architektura Systemu

System działa w architekturze klient-serwer, gdzie **Centrum Logowania** pełni rolę zaufanej trzeciej strony. Aplikacje klienckie ("Projekty") nie przechowują haseł ani danych wrażliwych użytkowników, a jedynie weryfikują tożsamość poprzez wymianę tokenów.

### Przepływ Autoryzacji (Flow)

Poniższy diagram przedstawia proces logowania użytkownika w zewnętrznej aplikacji (Client App) przy użyciu Centrum Logowania.

```mermaid
sequenceDiagram
    participant User as Użytkownik
    participant Client as Aplikacja Kliencka
    participant CL as Centrum Logowania
    participant Provider as Google/Social
    participant DB as CL Database

    User->>Client: Kliknij "Zaloguj przez CL"
    Client->>CL: Redirect (z ?project=slug)
    CL->>User: Wyświetl ekran logowania
    User->>CL: Wybierz metodę (np. Google)
    CL->>Provider: OAuth Request
    Provider->>CL: OAuth Callback (User Data)
    CL->>DB: Utwórz/Aktualizuj User & Session
    CL->>DB: Generuj Authorization Code
    CL->>Client: Redirect (z ?code=AUTH_CODE)
    Client->>CL: POST /api/v1/token (wymiana kodu)
    Note over Client,CL: Weryfikacja API Key Projektu
    CL->>Client: Zwróć User Data & Access Info
    Client->>User: Zalogowano pomyślnie
```

### Kluczowe Komponenty

1.  **Identity Hub**: Centralny punkt, w którym użytkownicy posiadają jedno konto globalne.
2.  **Multi-tenancy**: Logika "Projektów" pozwala na izolację uprawnień. Użytkownik może być administratorem w Projekcie A, ale zwykłym użytkownikiem (lub nie mieć dostępu) w Projekcie B.
3.  **API Gateway**: Zestaw zabezpieczonych endpointów do weryfikacji sesji i wymiany tokenów.

---

## 💻 Technologie (Tech Stack)

Projekt został zbudowany z naciskiem na wydajność, bezpieczeństwo i typowanie statyczne.

| Kategoria      | Technologia                  | Wersja / Opis                                     |
| :------------- | :--------------------------- | :------------------------------------------------ |
| **Framework**  | **Next.js 15 (App Router)**  | Najnowsza wersja z React Server Components.       |
| **Language**   | **TypeScript**               | Pełne typowanie dla bezpieczeństwa kodu.          |
| **Database**   | **PostgreSQL**               | Hosting na Neon.tech (Serverless Postgres).       |
| **ORM**        | **Drizzle ORM**              | Lekki, typowany ORM z migracjami (`drizzle-kit`). |
| **Auth**       | **NextAuth.js v5 (Beta)**    | Obsługa sesji, ciasteczek i OAuth Providers.      |
| **Styling**    | **Tailwind CSS + shadcn/ui** | Nowoczesny system designu i komponentów.          |
| **Validation** | **Zod**                      | Walidacja schematów danych runtime.               |
| **API Client** | **Axios / Fetch**            | Komunikacja HTTP.                                 |

---

## 💾 Model Danych (DB Schema)

Baza danych została zaprojektowana w oparciu o relacyjne struktury zapewniające integralność danych. Poniżej znajduje się diagram ERD kluczowych tabel.

```mermaid
erDiagram
    Users ||--o{ Accounts : "posiada"
    Users ||--o{ Sessions : "ma aktywne"
    Users ||--o{ Projects : "jest właścicielem"
    Users ||--o{ ProjectUsers : "należy do"
    Users ||--o{ AuditLogs : "generuje"

    Projects ||--o{ AuthorizationCodes : "wydaje"
    Projects ||--o{ ProjectSessions : "monitoruje"
    Projects ||--o{ ProjectSetupCodes : "używa do setupu"

    Users {
        uuid id PK
        string email
        int tokenVersion "Dla Kill Switch"
    }

    Projects {
        uuid id PK
        string slug "Unikalny ID"
        string apiKey "Secret"
        boolean isPublic
    }

    AuthorizationCodes {
        uuid id PK
        string code "Jednorazowy"
        timestamp expiresAt
    }

    AuditLogs {
        uuid id PK
        string action
        string ipAddress
        json metadata
    }
```

### Opis Tabel

1.  **`user`**: Główna tabela tożsamości. Zawiera pole `tokenVersion` służące do globalnego unieważniania sesji (Kill Switch).
2.  **`project`**: Definicja zewnętrznej aplikacji. Zawiera `apiKey` (tajny klucz do komunikacji serwer-serwer) oraz `slug` (identyfikator publiczny).
3.  **`authorization_code`**: Przechowuje krótkotrwałe (np. 5 min) kody używane w procesie logowania OAuth2 Flow.
4.  **`project_session`**: "Shadow session" - pozwala administratorowi widzieć, kto jest aktualnie zalogowany w jego projekcie.
5.  **`audit_log`**: Rejestr zdarzeń krytycznych (logowania, błędy, zmiany uprawnień) dla celów compliance i bezpieczeństwa.
6.  **`rate_limit_entry`**: Tabela techniczna do ochrony przed atakami Brute Force/DDoS na poziomie aplikacji.

---

## 🚀 Instalacja i Konfiguracja

### Wymagania Wstępne

- Node.js v18+
- Menedżer pakietów `npm`
- Baza danych PostgreSQL (lokalna lub w chmurze)

### 1. Klonowanie i Instalacja

```bash
git clone <repository_url>
cd centrum-logowania-app
npm install
```

### 2. Zmienne Środowiskowe (.env)

Utwórz plik `.env` w głównym katalogu. To krytyczny krok dla bezpieczeństwa.

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/db_name"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="wygeneruj_dlugi_losowy_ciag_znakow" # openssl rand -base64 32

# Google OAuth (Pobierz z Google Cloud Console)
AUTH_GOOGLE_ID="twoj_client_id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="twoj_client_secret"

# Opcjonalne (Dev)
NODE_ENV="development"
```

### 3. Migracja Bazy Danych

Zainicjalizuj schemat bazy danych przy użyciu Drizzle Kit.

```bash
# Push schema changes to DB
npx drizzle-kit migrate

# (Opcjonalnie) Otwórz Drizzle Studio do podglądu danych
npx drizzle-kit studio
```

### 4. Uruchomienie Serwera

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: `http://localhost:3000`.

---

## 🛡️ Bezpieczeństwo

To jest priorytet tego systemu. Zastosowano wielowarstwowe mechanizmy ochronne.

### 1. Kill Switch (Token Versioning)

Mechanizm pozwalający na **natychmiastowe unieważnienie wszystkich sesji użytkownika**.

- **Jak to działa**: Każdy user ma w bazie `tokenVersion`. Wartość ta jest zaszyta w tokenie JWT. Przy każdym wrażliwym requeście API sprawdza zgodność wersji.
- **Akcja**: Zmiana hasła lub kliknięcie "Wyloguj ze wszystkich urządzeń" podbija wersję w bazie, co sprawia, że stare tokeny (nawet jeśli są ważne czasowo) stają się bezużyteczne.

### 2. Audit Logs

Każda akcja (sukces lub porażka logowania, wymiana tokena) jest rejestrowana.

- **Co logujemy**: IP, User Agent, ID Projektu, Typ akcji, Timestamp.
- **Cel**: Wykrywanie anomalii i śledzenie incydentów.

### 3. Rate Limiting

Ochrona API przed przeciążeniem i atakami siłowymi. Limity są nakładane na IP lub Token w oknach czasowych (np. 60 requestów/minutę).

### 4. Izolacja Danych

Projekty mogą być **Prywatne**. W takim trybie system odrzuci próbę logowania użytkownika, który nie znajduje się w tabeli `project_users` dla danego projektu (Błąd 403 Forbidden), nawet jeśli użytkownik ma poprawne konto w Centrum Logowania.

---

## 🔌 Dokumentacja API

Główne endpointy integrajyjne. Wszystkie endpointy prywatne (serwer-serwer) wymagają nagłówka `x-api-key`.

### Endpointy Uwierzytelniania

#### `POST /api/v1/token`

Wymiana kodu autoryzacyjnego na dane użytkownika.

**Request:**

```bash
curl -X POST /api/v1/token \
  -H "x-api-key: cl_PROJECT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code": "auth_code_xyz", "redirect_uri": "..."}'
```

**Response (200):**

```json
{
  "user": { "id": "...", "email": "...", "name": "...", "image": "..." },
  "project": { "id": "...", "name": "..." }
}
```

#### `POST /api/v1/verify`

Weryfikuje ważność tokenu JWT i zwraca dane użytkownika. Używany przez zewnętrzne aplikacje do sprawdzania, czy użytkownik jest zalogowany.

**Request:**

```bash
curl -X POST /api/v1/verify \
  -H "x-api-key: cl_PROJECT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"token": "eyJhbGciOiJ..."}'
```

**Response (200):**

```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jan Kowalski",
    "role": "user"
  },
  "project": {
    "id": "project_uuid",
    "name": "Moja Aplikacja"
  }
}
```

#### `POST /api/v1/session/verify`

Weryfikacja ważności sesji (sprawdzenie Kill Switcha).

**Request:**

```json
{ "userId": "uuid", "tokenVersion": 1 }
```

**Response:**
Wartość `valid: true/false`. Jeśli false, aplikacja kliencka powinna natychmiast wylogować użytkownika.

### Zarządzanie Projektami

- `GET /api/v1/audit-logs` - Pobieranie logów.
- `GET /api/v1/project/[id]/members` - Lista członków.
- `POST /api/v1/projects/claim` - Endpoint dla Quick Connect (wymiana Setup Code na konfigurację).

---

## 🤝 Integracja (Quick Connect)

Funkcja **Quick Connect** pozwala na błyskawiczne połączenie nowej aplikacji z Centrum Logowania bez ręcznego kopiowania kluczy.

1.  **Generuj Kod**: W Dashboardzie Centrum Logowania administrator generuje `Setup Code` (ważny np. 15 minut).
2.  **Wklej Kod**: W nowej aplikacji klienckiej, podczas instalacji, podajesz ten kod.
3.  **Auto-Konfiguracja**: Aplikacja kliencka uderza do endpointu `/api/v1/projects/claim`.
    - Weryfikuje kod.
    - Pobiera `API Key`, `Project Slug` i `Project ID`.
    - Automatycznie zapisuje konfigurację.

To eliminuje błędy ludzkie przy kopiowaniu długich ciągów znaków i kluczy API.

---

## 8. Dema i Przykłady Integracji

W repozytorium znajdują się przykładowe aplikacje demonstrujące dwa główne modele integracji z Centrum Logowania.

### Model 1: Client-Side (SPA / Frontend Only)

Przeznaczony dla aplikacji typu Single Page Application (React, Vue, statyczny HTML) bez własnego backendu, które komunikują się bezpośrednio z API Centrum Logowania.

- **Lokalizacja**: `public/demo-apps/shop`
- **Uruchomienie**: Aplikacja jest dostępna pod adresem `/demo-apps/shop/index.html` po uruchomieniu głównego serwera (`npm run dev`).
- **Cechy**:
  - Używa `public/sdk/auth.js`.
  - Weryfikacja sesji odbywa się przez publiczny endpoint.
  - Mniej bezpieczny (tokeny w localStorage).

### Model 2: Server-Side (Backend / Next.js)

Przeznaczony dla aplikacji posiadających własny backend (np. Next.js, Express, PHP), które wymagają najwyższego poziomu bezpieczeństwa. Wszystkie operacje (wymiana kodu, weryfikacja sesji) odbywają się bezpośrednio między serwerami (Back-channel).

- **Lokalizacja**: `examples/server-integration`
- **Wymagania**: Node.js v18+
- **Uruchomienie**:

  ```bash
  # W osobnej konsoli (wymaga działającego CLA na porcie 3000)
  npm run demo:server
  # LUB uruchom razem z główną aplikacją
  npm run dev:demo
  ```

  Aplikacja uruchomi się na pierwszym wolnym porcie (np. **3001**, **3002**...). Adres zostanie wyświetlony w konsoli.

- **Nowe Funkcje (v2)**:
  - **Single View Architecture**: Cały proces (Setup -> Login -> Dashboard) odbywa się na jednym widoku bez zbędnych przekierowań.
  - **Smart Setup**: Automatycznie wykrywa brak połączenia z CLA (Status Check) i wyświetla ostrzeżenie.
  - **Dynamic Redirect URI**: Wyświetla dokładny adres `redirect_uri` (z uwzględnieniem losowego portu), który należy dodać w Dashboardzie CLA.
  - **Pełna Diagnostyka**: W konsoli wyświetlane są szczegółowe, kolorowe logi każdego Requestu/Response (Header, Body, Status).
  - **Dark Mode**: Interfejs przyjazny dla oczu (High Contrast).

- **Workflow**:
  1.  **Ekran Startowy**: Jeśli brak konfiguracji, zobaczysz formularz Setupu.
      - Użyj **Quick Connect** (wklej Setup Code z CLA) lub wpisz klucze ręcznie.
      - **Ważne**: Skopiuj wyświetlony `http://localhost:XXXX/callback` do ustawień projektu w CLA!
  2.  **Ekran Logowania**: Po konfiguracji pojawi się przycisk "Zaloguj przez Centrum".
  3.  **Dashboard**: Po zalogowaniu widzisz swoje dane i status sesji.
      - Możesz zarządzać połączeniem (Re-konfiguracja, Pełny Reset) bezpośrednio z tego poziomu.

---

## 9. Dashboard Zarządzania

Dostępny pod adresem `/dashboard` dla zalogowanych użytkowników. Umożliwia:

- **Podgląd Profilu**: Wyświetlanie danych osobowych i awatara.
- **Zarządzanie Sesjami**: Przycisk "Wyloguj ze wszystkich urządzeń" (Kill Switch).
- **Zarządzanie Projektami**:
  - Tworzenie nowych projektów (generowanie API Key i Slug).
  - Kopiowanie kluczy API.
  - Generowanie Setup Codes dla Quick Connect.
  - Podgląd aktywnych sesji użytkowników w projektach.

---

## 🧬 Testy Mutacyjne (Mutation Testing)

Mutation testing to zaawansowana technika weryfikacji jakości testów. Stryker celowo "psuje" (mutuje) kod i sprawdza czy testy wykryją te zmiany.

### Czym jest mutation testing?

#### Problem z tradycyjnym coverage

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

#### Jak działa Stryker?

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

### Uruchomienie lokalne

#### Szybki start

```bash
# Uruchom mutation testing
npm run test:mutation

# Uruchom i otwórz raport HTML
npm run test:mutation:report
```

#### Opcje uruchomienia

```bash
# Mniej procesów (wolniejsze, mniej RAM)
npm run test:mutation -- --concurrency 2

# Więcej procesów (szybsze, więcej RAM)
npm run test:mutation -- --concurrency 8

# Tylko konkretny plik
npx stryker run --mutate "src/components/auth/**/*.tsx"
```

#### Czas wykonania

| Projekt                  | Czas       |
| ------------------------ | ---------- |
| Mały (< 50 mutantów)     | ~2-5 min   |
| Średni (50-200 mutantów) | ~5-15 min  |
| Duży (> 200 mutantów)    | ~15-60 min |

> ⚠️ **Uwaga:** Mutation testing jest WOLNY - uruchamiaj okazjonalnie, nie przy każdym uposzie.

### Uruchomienie na GitHub Actions

#### Automatyczne uruchomienie

Workflow uruchamia się automatycznie:

- **Co niedzielę o 3:00 UTC** (scheduled)

#### Ręczne uruchomienie

1. Przejdź do **Actions** w repozytorium GitHub
2. Wybierz workflow **"Mutation Testing (Stryker)"**
3. Kliknij **"Run workflow"**
4. Opcjonalnie zmień:
   - `concurrency` - liczba procesów (2/4/8)
   - `incremental` - tylko zmienione pliki

![GitHub Actions](https://docs.github.com/assets/cb-15465/mw-1440/images/help/actions/actions-select-workflow.webp)

#### Gdzie znaleźć wyniki?

1. Po zakończeniu workflow → kliknij na uruchomienie
2. Przejdź do **Summary** - zobaczysz podsumowanie
3. W sekcji **Artifacts** pobierz `mutation-report-xxx`
4. Rozpakuj i otwórz `html/index.html`

### Interpretacja wyników

#### Mutation Score

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

#### Typy mutantów

| Typ                       | Przykład             | Co sprawdza           |
| ------------------------- | -------------------- | --------------------- |
| **ArithmeticOperator**    | `+` → `-`            | Operacje matematyczne |
| **EqualityOperator**      | `===` → `!==`        | Porównania            |
| **ConditionalExpression** | `if(x)` → `if(true)` | Warunki               |
| **StringLiteral**         | `"abc"` → `""`       | Stringi               |
| **BlockStatement**        | `{ code }` → `{}`    | Bloki kodu            |

#### Co zrobić gdy mutant przeżył?

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

### Konfiguracja

#### Plik konfiguracyjny

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

#### Kluczowe opcje

| Opcja              | Opis                                       |
| ------------------ | ------------------------------------------ |
| `mutate`           | Pliki do mutowania (glob patterns)         |
| `thresholds.high`  | Score powyżej = zielony                    |
| `thresholds.low`   | Score poniżej = czerwony                   |
| `thresholds.break` | Score poniżej = fail CI (null = wyłączone) |
| `concurrency`      | Liczba równoległych procesów               |
| `timeoutMS`        | Timeout dla pojedynczego testu             |

#### Wykluczanie plików

W `stryker.config.json` w sekcji `mutate`:

```json
"mutate": [
  "src/**/*.ts",
  "!src/**/types/**",      // Wyklucz typy
  "!src/**/constants.ts",  // Wyklucz stałe
  "!src/**/*.d.ts"         // Wyklucz deklaracje
]
```

### FAQ

#### Czy muszę mieć 100% mutation score?

**Nie.** Realistyczny cel to **70-80%**. Niektóre mutacje są trudne do wykrycia (np. zmiany w logowaniu).

#### Mutation testing jest bardzo wolny - co robić?

1. Uruchamiaj tylko na CI (raz dziennie/tygodniowo)
2. Testuj tylko zmienione pliki: `--mutate "src/changed/**"`
3. Zmniejsz concurrency jeśli brakuje RAM

#### Dlaczego niektóre mutanty są "No Coverage"?

Oznacza to że kod nie jest pokryty ŻADNYM testem. Najpierw dodaj podstawowy test.

#### Czy Stryker wspiera Vitest 4?

⚠️ Oficjalny `@stryker-mutator/vitest-runner` jeszcze nie wspiera Vitest 4. Używamy `command` runnera jako workaround - działa, ale jest wolniejszy.

#### Jak często uruchamiać mutation testing?

| Scenariusz    | Częstotliwość   |
| ------------- | --------------- |
| Lokalnie      | Przed ważnym PR |
| CI            | Raz w tygodniu  |
| Przed release | Obowiązkowo     |

### Przydatne linki

- [Stryker Mutator - Dokumentacja](https://stryker-mutator.io/docs/)
- [Mutation Testing - Wikipedia](https://en.wikipedia.org/wiki/Mutation_testing)
- [Stryker Dashboard](https://dashboard.stryker-mutator.io/) - publiczny hosting raportów

### Podsumowanie komend

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

---

## 🎨 Testowanie Wizualne (Visual Regression Testing)

System testowania wizualnego pozwala na automatyczne sprawdzanie wyglądu aplikacji na różnych urządzeniach i rozdzielczościach, oraz porównywanie zmian przed i po aktualizacjach.

### Czym jest Visual Regression Testing?

Testowanie wizualne automatycznie:

- ✅ Robi screenshoty kluczowych widoków aplikacji
- ✅ Porównuje je z wcześniejszymi wersjami (baseline)
- ✅ Wykrywa nieoczekiwane zmiany wizualne
- ✅ Generuje raporty z różnicami

### Narzędzia

Projekt używa dwóch narzędzi:

1. **Percy.io** (Rekomendowane) - zewnętrzna usługa z zaawansowanymi raportami
2. **Playwright Visual Comparisons** - lokalne rozwiązanie wbudowane w Playwright

### Szybki Start

```bash
# Instalacja
npm install --save-dev @percy/playwright

# Konfiguracja Percy (wymaga tokenu - zobacz VISUAL_TESTING_SETUP.md)
export PERCY_TOKEN="your-token-here"

# Uruchomienie testów wizualnych z Percy
npm run test:visual

# Uruchomienie lokalnych testów wizualnych
npm run test:visual:local
```

### Testowane Widoki

- Strona główna (`/`)
- Dashboard (`/dashboard`)
- Szczegóły projektu (`/dashboard/projects/[id]`)
- Formularze i dialogi
- Responsywność (Desktop, Tablet, Mobile)

### Urządzenia i Rozdzielczości

- **Desktop**: 1920x1080 (Chrome, Firefox)
- **Tablet**: iPad Pro (1024x1366)
- **Mobile**: iPhone 14 Pro (390x844)

### Raporty

**Percy.io:**

- Automatyczne raporty po każdym uruchomieniu
- Link do dashboardu z porównaniami
- Integracja z GitHub (komentarze w PR)

**Playwright Visual:**

- Lokalne raporty HTML
- Screenshoty różnic w `test-results/`

### Dokumentacja

- 📋 [Plan Testowania Wizualnego](./VISUAL_TESTING_PLAN.md) - szczegółowy plan i strategia
- 🚀 [Instrukcja Konfiguracji](./VISUAL_TESTING_SETUP.md) - krok po kroku
- 📚 [README Testów Wizualnych](./tests/visual/README.md) - szczegóły techniczne

### Przydatne Linki

- [Percy.io Documentation](https://docs.percy.io)
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-screenshots)
