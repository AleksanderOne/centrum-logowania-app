# Plan Wdrożenia: Centralne Centrum Logowania (Identity Provider)

Ten dokument śledzi **pozostałe zadania** do zaimplementowania.

---

---

## 3. Rozwój (Future) - Plan 2FA (Dwuskładnikowe Uwierzytelnianie)

> **Priorytet**: Wysoki  
> **Metoda**: TOTP (Time-based One-Time Password) - Google Authenticator, Authy, 1Password  
> **Szacowany czas**: 3-5 dni roboczych

### 📋 Faza 1: Przygotowanie Bazy Danych i Infrastruktury

- [ ] **1.1 Instalacja zależności**

  ```bash
  npm install otplib qrcode @types/qrcode
  ```

  - `otplib` - generowanie i weryfikacja kodów TOTP (RFC 6238)
  - `qrcode` - generowanie kodów QR dla aplikacji authenticator

- [ ] **1.2 Nowa migracja: rozszerzenie tabeli `users`**

  ```sql
  -- drizzle/0005_add_2fa_fields.sql
  ALTER TABLE centrum_logowania.user
    ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false,
    ADD COLUMN two_factor_secret TEXT,           -- Zaszyfrowany sekret TOTP
    ADD COLUMN two_factor_verified_at TIMESTAMP, -- Kiedy włączono 2FA
    ADD COLUMN backup_codes TEXT[];              -- Tablica zaszyfrowanych kodów zapasowych
  ```

- [ ] **1.3 Aktualizacja schematu Drizzle** (`src/lib/db/schema.ts`)
  ```typescript
  export const users = mySchema.table('user', {
    // ... istniejące pola
    twoFactorEnabled: boolean('two_factor_enabled').default(false),
    twoFactorSecret: text('two_factor_secret'), // Zaszyfrowany AES-256-GCM
    twoFactorVerifiedAt: timestamp('two_factor_verified_at'),
    backupCodes: text('backup_codes').array(), // ["hash1", "hash2", ...]
  });
  ```

### 📋 Faza 2: Logika Szyfrowania i TOTP

- [ ] **2.1 Moduł szyfrowania** (`src/lib/security/encryption.ts`)
  - Szyfrowanie sekretów TOTP (AES-256-GCM)
  - Klucz z `process.env.ENCRYPTION_KEY` (generowany raz)
  - Funkcje: `encrypt(plaintext)`, `decrypt(ciphertext)`

- [ ] **2.2 Moduł TOTP** (`src/lib/security/totp.ts`)
  ```typescript
  // Funkcje:
  generateSecret(email: string)     // Zwraca { secret, otpauthUrl, qrCodeDataUrl }
  verifyToken(secret: string, token: string)  // Sprawdza kod 6-cyfrowy
  generateBackupCodes(count: number)          // Generuje 10 kodów zapasowych
  verifyBackupCode(userId: string, code: string) // Sprawdza i "spala" kod
  ```

### 📋 Faza 3: API Endpoints

- [ ] **3.1 Endpoint: Inicjalizacja 2FA** (`POST /api/v1/2fa/setup`)
  - Wymaga autoryzacji (sesja)
  - Generuje sekret TOTP, zwraca QR code
  - Zapisuje sekret tymczasowo (jeszcze niezweryfikowany)
  - Response: `{ qrCodeUrl, manualEntryKey }`

- [ ] **3.2 Endpoint: Weryfikacja i aktywacja** (`POST /api/v1/2fa/verify`)
  - Przyjmuje kod 6-cyfrowy z aplikacji
  - Weryfikuje poprawność
  - Ustawia `two_factor_enabled = true`, `two_factor_verified_at = now()`
  - Generuje i zwraca kody zapasowe
  - Response: `{ success, backupCodes: ["XXXX-XXXX", ...] }`

- [ ] **3.3 Endpoint: Wyłączenie 2FA** (`DELETE /api/v1/2fa/disable`)
  - Wymaga potwierdzenia hasłem LUB kodem TOTP
  - Czyści pola 2FA w bazie
  - Loguje akcję w audit_logs

- [ ] **3.4 Endpoint: Weryfikacja przy logowaniu** (`POST /api/v1/2fa/challenge`)
  - Używany po pomyślnym logowaniu Google
  - Przyjmuje kod TOTP lub backup code
  - Wydaje ostateczny token sesji

### 📋 Faza 4: Zmiany w Flow Logowania

- [ ] **4.1 Modyfikacja `signIn` callback** (`src/lib/auth.ts`)

  ```typescript
  // W callbacku signIn:
  // 1. Sprawdź czy user ma włączone 2FA
  // 2. Jeśli tak -> przekieruj do /auth/2fa-challenge zamiast sukcesu
  // 3. Ustaw tymczasowy token "pending_2fa" w sesji
  ```

- [ ] **4.2 Nowa strona: Challenge 2FA** (`src/app/auth/2fa-challenge/page.tsx`)
  - Formularz do wpisania kodu 6-cyfrowego
  - Link "Użyj kodu zapasowego"
  - Timer odliczający (30s cykl TOTP)
  - Przycisk "Anuluj" (powrót do logowania)

- [ ] **4.3 Obsługa pending state** (middleware)
  - Użytkownik z `pending_2fa` może tylko dostęp do `/auth/2fa-challenge`
  - Blokada innych tras do momentu weryfikacji

### 📋 Faza 5: Interfejs Użytkownika

- [ ] **5.1 Komponent konfiguracji 2FA** (`src/components/dashboard/two-factor-setup.tsx`)
  - Wielokrokowy wizard:
    1. Skanuj QR code lub wpisz klucz ręcznie
    2. Wpisz kod weryfikacyjny z aplikacji
    3. Zapisz kody zapasowe (wymuszenie pobrania/wydruku)
  - Warianty: Setup (gdy wyłączone) / Status (gdy włączone)

- [ ] **5.2 Rozbudowa strony profilu** (`src/app/dashboard/user/page.tsx`)
  - Nowa sekcja "Uwierzytelnianie dwuskładnikowe"
  - Status: Włączone ✅ / Wyłączone ❌
  - Przyciski: "Włącz 2FA" / "Wyłącz 2FA" / "Regeneruj kody zapasowe"

- [ ] **5.3 Komponent wprowadzania kodu** (`src/components/auth/totp-input.tsx`)
  - 6 osobnych pól input (auto-focus na następne)
  - Walidacja tylko cyfr
  - Auto-submit po wpisaniu 6 cyfr
  - Obsługa paste (wklejanie całego kodu)

### 📋 Faza 6: Bezpieczeństwo i Edge Cases

- [ ] **6.1 Rate limiting dla 2FA**
  - Max 5 prób weryfikacji na 15 minut
  - Blokada konta po 10 nieudanych próbach
  - Alert email przy podejrzanej aktywności

- [ ] **6.2 Audyt logów**
  - Nowe akcje: `2fa_enabled`, `2fa_disabled`, `2fa_challenge_success`, `2fa_challenge_failure`
  - Logowanie użytych backup codes

- [ ] **6.3 Sesje trusted devices** (opcjonalne)
  - "Zapamiętaj to urządzenie na 30 dni"
  - Cookie z fingerprint urządzenia
  - Tabela `trusted_devices`

- [ ] **6.4 Recovery flow**
  - Procedura odzyskania konta bez 2FA
  - Weryfikacja email + czas oczekiwania (24h)
  - Powiadomienie na email o próbie wyłączenia

### 📋 Faza 7: Testy

- [ ] **7.1 Testy jednostkowe** (`src/lib/security/totp.test.ts`)
  - Generowanie sekretów
  - Weryfikacja kodów (poprawne/błędne/przeterminowane)
  - Backup codes (użycie, spalanie)

- [ ] **7.2 Testy integracyjne** (API)
  - Pełny flow setup 2FA
  - Challenge przy logowaniu
  - Wyłączanie 2FA

- [ ] **7.3 Testy E2E** (Playwright)
  - Scenariusz: Konfiguracja 2FA w dashboard
  - Scenariusz: Logowanie z 2FA
  - Scenariusz: Użycie backup code

### 📋 Faza 8: Dokumentacja i Deploy

- [ ] **8.1 Dokumentacja użytkownika**
  - Jak włączyć 2FA (z obrazkami)
  - Zalecane aplikacje (Google Authenticator, Authy)
  - Co robić gdy stracisz telefon

- [ ] **8.2 Dokumentacja techniczna**
  - API endpoints 2FA
  - Struktura danych
  - Proces recovery

- [ ] **8.3 Zmienne środowiskowe**

  ```env
  ENCRYPTION_KEY=<32 bajty w hex, wygenerowane raz>
  ```

- [ ] **8.4 Rollout**
  - Feature flag: `ENABLE_2FA=true`
  - Początkowo opcjonalne dla wszystkich
  - Później: wymuszone dla adminów

---

### 📊 Diagram Flow 2FA

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Login Google   │────▶│  Sprawdź 2FA     │────▶│  Dashboard      │
│                 │     │  enabled?        │ NIE │  (sukces)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │ TAK
                               ▼
                        ┌──────────────────┐
                        │  /auth/2fa       │
                        │  challenge       │
                        └──────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │ Kod     │ │ Backup  │ │ Anuluj  │
              │ TOTP    │ │ code    │ │         │
              └─────────┘ └─────────┘ └─────────┘
                    │          │          │
                    └────┬─────┘          │
                         ▼                ▼
                  ┌──────────────┐  ┌──────────────┐
                  │  Sukces →    │  │  Powrót do   │
                  │  Dashboard   │  │  logowania   │
                  └──────────────┘  └──────────────┘
```

---

### 🔧 Polecane Biblioteki

| Biblioteka      | Wersja  | Cel                                        |
| --------------- | ------- | ------------------------------------------ |
| `otplib`        | ^12.0.1 | Generowanie/weryfikacja TOTP (RFC 6238)    |
| `qrcode`        | ^1.5.3  | Generowanie QR code dla authenticator apps |
| `@types/qrcode` | ^1.5.5  | TypeScript types                           |

---

### ⚠️ Uwagi Bezpieczeństwa

1. **Sekret TOTP** musi być zaszyfrowany w bazie (AES-256-GCM)
2. **Backup codes** powinny być hashowane (bcrypt/argon2)
3. **ENCRYPTION_KEY** przechowywany bezpiecznie (secrets manager)
4. **QR code** generowany server-side, nigdy client-side
5. **Okno czasowe TOTP**: ±1 interwał (30s) dla tolerancji

---

## ✅ Ukończone sekcje

<details>
<summary>Kliknij aby rozwinąć listę ukończonych zadań</summary>

### UI & Design System (shadcn/ui)

- [x] Inicjalizacja shadcn/ui (Dark/Light Mode)
- [x] Komponenty: Button, Input, Label, Form, Card, Toast, DropdownMenu, Avatar, Skeleton, Alert, Table, Badge

### Architektura i Baza Danych

- [x] Multi-tenancy: tabele `projects`, `projectUsers`, `projectSessions`
- [x] Stack: Next.js + Drizzle ORM + PostgreSQL
- [x] NextAuth.js v5 z adapterem Drizzle

### Metody Logowania

- [x] Social Login (Google)
- [x] Ujednolicony interfejs logowania

### Integracja Zewnętrzna

- [x] OAuth2 Provider flow (`/authorize`, `/api/v1/token`)
- [x] Template integracji w `src/templates/sso-integration/`
- [x] API dla walidacji sesji (`/api/v1/verify`, `/api/v1/session/verify`)

### Dashboard Zarządzania

- [x] Widok Projektów (tworzenie, lista, API Keys)
- [x] Zarządzanie Sesjami (Kill Switch, token versioning)

### Bezpieczeństwo

- [x] Izolacja Danych (projekty publiczne/prywatne, `project_users`)
- [x] Rate Limiting (tabela `rate_limit_entries`, nagłówki HTTP)
- [x] Audyt Logów (tabela `audit_logs`, komponent `AuditLogsViewer`)

### Testy i Jakość (QA & Testing)

- [x] **Testy Jednostkowe (Unit)**: 103 testy w 12 plikach testowych
- [x] **Testy Integracyjne (Integration)**: Endpointy API (`/api/v1/token`, `/api/v1/verify`, `/api/v1/session/verify`, `/api/health`)
- [x] **Testy E2E (End-to-End)**: 28 testów Playwright - autoryzacja, dashboard, responsywność, wydajność

</details>
