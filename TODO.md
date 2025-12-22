# Plan Wdrożenia: Centralne Centrum Logowania (Identity Provider)

Ten dokument śledzi postępy w implementacji centralnego systemu uwierzytelniania, który będzie obsługiwał wiele zewnętrznych projektów/aplikacji.

## 0. UI & Design System (shadcn/ui)
- [x] **Inicjalizacja shadcn/ui**: Skonfigurowanie biblioteki, kolorów, czcionek oraz motywu (Dark/Light Mode).
- [x] **Instalacja komponentów**: Button, Input, Label, Form, Card, Toast, DropdownMenu, Avatar, Skeleton, Alert, Table, Badge.

## 1. Architektura i Baza Danych (Core & Architecture)
- [ ] **Struktura Multi-tenancy**: Zaprojektowanie schematu bazy danych uwzględniającego **Projekty (Applications)**.
    - Tabela `Project` (API Keys, nazwa, domena powrotu).
    - Relacja `User` przypisana do konkretnego `Project` (lub globalne konto z uprawnieniami per projekt).
- [ ] **Stack Technologiczny**: Next.js + Drizzle ORM + PostgreSQL.
- [ ] **Wybór Silnika Auth**: NextAuth.js (jako baza) lub implementacja własna w oparciu o Iron Session/Lucia (dla większej kontroli nad byciem "Providerem").

## 2. Metody Logowania (Authentication Methods)
- [ ] **Login & Hasło**: Tradycyjne logowanie (Email/Username + Password).
- [ ] **Social Login**: Integracja Google (jako MVP) z możliwością łatwego dodania innych (GitHub, Facebook) w przyszłości.
- [ ] **Ujednolicony Interfejs**: Jeden, spójny komponent logowania obsługujący wszystkie metody.

## 3. Integracja Zewnętrzna (Integration Layer)
- [ ] **Mechanizm "Wystawiania" Logowania**:
    - Opcja A: OAuth2 Provider (Twoje aplikacje przekierowują tutaj i wracają z tokenem).
    - Opcja B: SDK/Komponent (NPM package) renderowany w innych aplikacjach (trudniejsze w realizacji bezpiecznie, ale możliwe).
- [ ] **API dla Aplikacji Klienckich**: Endpointy do walidacji sesji/tokenu przez inne Twoje aplikacje.

## 4. Centralny Dashboard Zarządzania (Admin Dashboard)
- [ ] **Widok Projektów**: Tworzenie i konfiguracja nowych projektów (generowanie kluczy API dla nich).
- [ ] **Zarządzanie Użytkownikami**: Przeglądanie użytkowników per projekt (blokowanie, usuwanie, edycja danych).
- [ ] **Zarządzanie Sesjami**: Podgląd kto, gdzie i kiedy jest zalogowany z możliwością wymuszenia wylogowania (Kill Switch).

## 5. Bezpieczeństwo (Security)
- [ ] **Izolacja Danych**: Gwarancja, że user z Projektu A nie zaloguje się do Projektu B (chyba że tak skonfigurujemy).
- [ ] **Rate Limiting & Brute Force Protection**.
- [ ] **Audyt Logów**: Historia logowań (kto, kiedy, z jakiego IP).

## 6.Rozwój (Future)
- [ ] **2FA**.
- [ ] **Więcej dostawców tożsamości**.
