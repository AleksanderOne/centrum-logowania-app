# Centrum Logowania - Dokumentacja Techniczna

## 1. Wstęp

Centrum Logowania to centralny system uwierzytelniania (Identity Provider), który umożliwia zarządzanie tożsamością użytkowników dla wielu zewnętrznych aplikacji. Działa jako "hub", w którym użytkownicy logują się raz, a inne aplikacje (Projekty) weryfikują ich tożsamość poprzez API.

## 2. Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Baza Danych**: PostgreSQL (Neon.tech)
- **ORM**: Drizzle ORM
- **Auth**: NextAuth.js v5 (Beta) + Google OAuth + Credentials
- **UI**: Tailwind CSS + shadcn/ui
- **Walidacja**: Zod

## 3. Uruchomienie Lokalne

1. **Instalacja zależności**:

   ```bash
   npm install
   ```

2. **Konfiguracja środowiska**:
   Utwórz plik `.env` na podstawie poniższego schematu:

   ```env
   DATABASE_URL="postgresql://..."
   NEXTAUTH_SECRET="twoj_sekret"
   NEXTAUTH_URL="http://localhost:3000"
   AUTH_GOOGLE_ID="google_client_id"
   AUTH_GOOGLE_SECRET="google_client_secret"
   ```

3. **Baza Danych**:
   Przygotuj schemat bazy danych:

   ```bash
   npx drizzle-kit migrate
   ```

4. **Uruchomienie serwera**:
   ```bash
   npm run dev
   ```

## 4. Architektura i Bezpieczeństwo

### Multi-tenancy (Projekty)

System pozwala na tworzenie "Projektów". Każdy projekt posiada:

- Unikalny `slug`
- `api_key` służący do weryfikacji tokenów

### Token Versioning (Kill Switch)

Wdrożono mechanizm natychmiastowego unieważniania sesji ("Wyloguj ze wszystkich urządzeń").

- W tabeli `user` znajduje się pole `tokenVersion`.
- Każdy token JWT zawiera `tokenVersion`.
- Przy każdym wrażliwym żądaniu (oraz w API weryfikacyjnym), wersja w tokenie jest porównywana z wersją w bazie.
- Jeśli wersje są różne, token jest odrzucany.

## 5. API Reference (Integracja)

Zewnętrzne aplikacje mogą weryfikować, czy użytkownik jest zalogowany, wysyłając token JWT (np. z ciasteczka `authjs.session-token`) do API Centrum Logowania.

### `POST /api/v1/verify`

Weryfikuje ważność tokenu JWT i zwraca dane użytkownika.

**Nagłówki:**

- `Content-Type`: `application/json`
- `x-api-key`: `Twój_Klucz_API_Projektu` (z Dashboardu)

**Body:**

```json
{
  "token": "eyJhbGciOiJ..."
}
```

**Odpowiedź Sukces (200 OK):**

```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jan Kowalski",
    "image": null,
    "role": "user"
  },
  "project": {
    "id": "project_uuid",
    "name": "Moja Aplikacja"
  }
}
```

**Odpowiedź Błąd (401 Unauthorized):**

```json
{
  "error": "Token revoked" // lub "Token expired", "Invalid token"
}
```

## 6. Dashboard Zarządzania

Dostępny pod adresem `/dashboard` dla zalogowanych użytkowników. Funkcje:

- Podgląd danych profilowych.
- Przycisk "Wyloguj ze wszystkich urządzeń".
- Lista utworzonych Projektów z możliwością kopiowania API Key.
- Formularz tworzenia nowego Projektu.
