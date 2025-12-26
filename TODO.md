# Plan Wdrożenia: Centralne Centrum Logowania (Identity Provider)

Ten dokument śledzi postępy w implementacji centralnego systemu uwierzytelniania, który będzie obsługiwał wiele zewnętrznych projektów/aplikacji.

## 0. UI & Design System (shadcn/ui)

- [x] **Inicjalizacja shadcn/ui**: Skonfigurowanie biblioteki, kolorów, czcionek oraz motywu (Dark/Light Mode).
- [x] **Instalacja komponentów**: Button, Input, Label, Form, Card, Toast, DropdownMenu, Avatar, Skeleton, Alert, Table, Badge.

## 1. Architektura i Baza Danych (Core & Architecture)

- [x] **Struktura Multi-tenancy**: Zaprojektowanie schematu bazy danych uwzględniającego **Projekty (Applications)**.
  - Tabela `Project` (API Keys, nazwa, domena powrotu).
  - Relacja `User` przypisana do konkretnego `Project` (lub globalne konto z uprawnieniami per projekt).
- [x] **Stack Technologiczny**: Next.js + Drizzle ORM + PostgreSQL.
- [x] **Wybór Silnika Auth**: NextAuth.js (v5 beta) skonfigurowany z adapterem Drizzle.

## 2. Metody Logowania (Authentication Methods)

- [x] ~~**Login & Hasło**: Tradycyjne logowanie (Email/Username + Password).~~ (Usunięte na rzecz Google Only)
- [x] **Social Login**: Integracja Google (jako MVP) z możliwością łatwego dodania innych (GitHub, Facebook) w przyszłości.
- [x] **Ujednolicony Interfejs**: Jeden, spójny komponent logowania obsługujący wszystkie metody.

## 3. Integracja Zewnętrzna (Integration Layer)

- [x] **Mechanizm "Wystawiania" Logowania**:
  - Opcja A: OAuth2 Provider (Twoje aplikacje przekierowują tutaj i wracają z tokenem).
  - [x] **Template integracji**: Gotowy zestaw plików w `src/templates/sso-integration/` do skopiowania do nowej aplikacji.
- [x] **API dla Aplikacji Klienckich**: Endpointy do walidacji sesji/tokenu przez inne Twoje aplikacje.

## 4. Centralny Dashboard Zarządzania (Admin Dashboard)

- [x] **Widok Projektów**: Tworzenie i konfiguracja nowych projektów (generowanie kluczy API dla nich).
- [ ] **Zarządzanie Użytkownikami**: Przeglądanie użytkowników per projekt (blokowanie, usuwanie, edycja danych).
- [x] **Zarządzanie Sesjami**: Podgląd kto, gdzie i kiedy jest zalogowany z możliwością wymuszenia wylogowania (Kill Switch - wersjonowanie tokenów).

## 5. Bezpieczeństwo (Security)

- [ ] **Izolacja Danych**: Gwarancja, że user z Projektu A nie zaloguje się do Projektu B (chyba że tak skonfigurujemy).
- [ ] **Rate Limiting & Brute Force Protection**.
- [ ] **Audyt Logów**: Historia logowań (kto, kiedy, z jakiego IP).

## 6. Testy i Jakość (QA & Testing)

- [ ] **Testy Jednostkowe (Unit)**: Testowanie komponentów UI oraz logiki biznesowej (helpery, walidatory).
- [ ] **Testy Integracyjne (Integration)**: Weryfikacja endpointów API, połączenia z bazą danych i przepływu autoryzacji (NextAuth).
- [ ] **Testy E2E (End-to-End)**: Pełne scenariusze (np. Playwright): Rejestracja -> Logowanie -> Przekierowanie do Demo App -> Powrót.

## 7. Rozwój (Future)

- [ ] **2FA**.
- [ ] **Więcej dostawców tożsamości**.
