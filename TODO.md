# 🛠️ Master Plan: Centrum Logowania (Identity Provider)

Dokument ten jest techniczną mapą drogową rozwoju aplikacji.

---

## ✅ ZREALIZOWANE

### Moduły Bezpieczeństwa (lib/security/)

- ✅ `csrf.ts` - CSRF protection z `requireValidOrigin()`
- ✅ `redirect-uri.ts` - walidacja redirect URI
- ✅ `pkce.ts` - pełna implementacja PKCE (+ integracja w authorize i token endpoints)
- ✅ `brute-force-detector.ts` - detekcja brute force
- ✅ `rate-limiter.ts` - limity per IP
- ✅ `audit-logger.ts` - logowanie zdarzeń
- ✅ `project-access.ts` - izolacja danych projektów
- ✅ `api-key-manager.ts` - zarządzanie API keys
- ✅ `audit-retention.ts` - retencja logów audytu
- ✅ `email-whitelist.ts` - whitelist domen email
- ✅ `security-monitoring.ts` - monitoring bezpieczeństwa

### Schema DB

- ✅ `code_challenge` i `code_challenge_method` w authorization_code (PKCE)
- ✅ `last_activity` w session (Idle Timeout)

### Funkcjonalności

- ✅ Setup Code (Quick Connect) - Backend + Frontend
- ✅ Audit Logging - pełne logowanie zdarzeń
- ✅ Google OAuth + Drizzle Adapter
- ✅ Rate Limiting per IP
- ✅ Kill Switch - token versioning

---

## 📋 DO ZROBIENIA

### 🔴 Priorytet 1 (Krytyczne)

#### 1.1 CORS & Secure Headers w `next.config.ts`

**Status**: ❌ Nie zrobione (obecnie CORS ma `*`)

Obecna konfiguracja jest niebezpieczna:

```typescript
{ key: 'Access-Control-Allow-Origin', value: '*' }
```

Trzeba:

- [ ] Dynamiczne CORS z `ALLOWED_ORIGINS` env
- [ ] Dodać nagłówki bezpieczeństwa (X-Frame-Options, CSP, HSTS, etc.)

#### 1.2 CSRF Protection w Endpointach

**Status**: ❌ Moduł istnieje, ale NIE jest używany w API routes

Dodać `requireValidOrigin(req)` do:

- [ ] `app/api/v1/token/route.ts`
- [ ] `app/api/v1/public/token/route.ts`
- [ ] `app/api/v1/projects/claim/route.ts`
- [ ] `app/api/v1/verify/route.ts`
- [ ] `app/api/v1/session/verify/route.ts`

#### 1.3 Brute Force Detection w Endpointach

**Status**: ❌ Moduł istnieje, ale NIE jest używany w API routes

Dodać `checkBruteForceByIp()` do:

- [ ] `app/api/v1/token/route.ts`
- [ ] `app/api/v1/public/token/route.ts`
- [ ] `app/api/v1/verify/route.ts`
- [ ] `app/api/v1/projects/claim/route.ts`

---

### 🟠 Priorytet 2 (Wysokie)

#### 2.1 Rate Limiting per User

**Status**: ❌ Nie zrobione

- [ ] Dodać `checkUserRateLimit()` do rate-limiter.ts
- [ ] Zintegrować w endpointach token exchange

#### 2.2 Rate Limiting dla Setup Codes

**Status**: ❌ Nie zrobione

- [ ] Restrykcyjne limity (5/min) dla `/api/v1/projects/claim`

---

### 🟡 Priorytet 3 (Średnie/Opcjonalne)

#### 3.1 IP Whitelisting dla Projektów

**Status**: ❌ Moduł NIE istnieje

- [ ] Utworzyć `lib/security/ip-whitelist.ts`
- [ ] Schema: tabela `project_ip_whitelist`
- [ ] Integracja w API endpoints

#### 3.2 Cron Job dla Audit Logs Cleanup

**Status**: ⚠️ Moduł istnieje, brak cron job

- [ ] Utworzyć `scripts/cleanup-audit-logs.ts`
- [ ] Dodać cron job (Vercel Cron lub inny)

#### 3.3 Security Alerts Cron

**Status**: ⚠️ Moduł istnieje, brak automatycznego sprawdzania

- [ ] Cron job do okresowego `checkSecurityAnomalies()`

---

### 🔵 Przyszłe Fazy

#### FAZA 2: 2FA (TOTP)

- [ ] Instalacja: `otplib`, `qrcode`
- [ ] Schema: `two_factor_enabled`, `two_factor_secret`, `backup_codes` w users
- [ ] Szyfrowanie sekretów AES-256-GCM
- [ ] API: `/api/v1/2fa/setup`, `/api/v1/2fa/verify`
- [ ] Integracja z NextAuth (partial login -> 2FA challenge)

#### FAZA 3: WebAuthn / Passkeys

- [ ] Instalacja: `@simplewebauthn/server`, `@simplewebauthn/browser`
- [ ] Schema: tabela `passkey`
- [ ] API: rejestracja i logowanie passkeys

---

### 🎨 UI/UX Improvements

- [ ] Potwierdzenie przed globalnym wylogowaniem
- [ ] Skeleton loaders na wszystkie dynamiczne sekcje
- [ ] Powiadomienia toast po zmianie motywu/wylogowaniu

---

_Ostatnia aktualizacja: 2025-12-30_
