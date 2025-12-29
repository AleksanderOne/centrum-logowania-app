# 🎨 Przewodnik: Jak Utworzyć Konto na Percy.io i Uzyskać Token

## Krok 1: Utworzenie Konta

### 1.1. Przejdź na stronę Percy.io

Otwórz przeglądarkę i przejdź na: **https://percy.io**

### 1.2. Kliknij "Sign Up" lub "Get Started"

Na stronie głównej znajdziesz przycisk do rejestracji.

### 1.3. Wybierz Metodę Rejestracji

Percy.io oferuje kilka opcji:
- **GitHub** (Rekomendowane) - najszybsze, używa konta GitHub
- **Email** - tradycyjna rejestracja przez email
- **Google** - rejestracja przez konto Google

**Rekomendacja:** Użyj GitHub, jeśli masz konto - ułatwi to integrację z projektem.

### 1.4. Autoryzacja (jeśli używasz GitHub/Google)

- Zostaniesz przekierowany do GitHub/Google
- Kliknij "Authorize" aby udzielić uprawnień
- Zostaniesz przekierowany z powrotem do Percy

### 1.5. Wypełnij Formularz (jeśli używasz Email)

- **Email** - podaj swój adres email
- **Password** - utwórz hasło (min. 8 znaków)
- Zaakceptuj warunki użytkowania
- Kliknij "Sign Up"

### 1.6. Weryfikacja Email (jeśli używasz Email)

- Sprawdź skrzynkę email
- Kliknij link weryfikacyjny w wiadomości od Percy

## Krok 2: Utworzenie Projektu

### 2.1. Po zalogowaniu - Dashboard

Po zalogowaniu zobaczysz dashboard Percy.io.

### 2.2. Utwórz Nowy Projekt

1. Kliknij przycisk **"Create Project"** lub **"New Project"**
2. Wypełnij formularz:
   - **Project Name**: `centrum-logowania-app` (lub dowolna nazwa)
   - **Repository**: Wybierz repozytorium GitHub (opcjonalnie)
   - **Framework**: Wybierz `Playwright` (lub pozostaw domyślne)

### 2.3. Potwierdź Utworzenie

Kliknij **"Create Project"** - projekt zostanie utworzony.

## Krok 3: Uzyskanie Tokenu (PERCY_TOKEN)

### 3.1. Przejdź do Ustawień Projektu

1. W dashboardzie kliknij na nazwę swojego projektu
2. Przejdź do zakładki **"Settings"** (w menu po lewej stronie)
3. Wybierz **"Project Settings"** lub **"API Tokens"**

### 3.2. Znajdź Sekcję Tokenów

W ustawieniach projektu znajdziesz sekcję:
- **"Project Token"** lub
- **"PERCY_TOKEN"** lub
- **"API Token"**

### 3.3. Skopiuj Token

1. Kliknij przycisk **"Show Token"** lub **"Reveal"** (jeśli token jest ukryty)
2. Skopiuj token (będzie wyglądał mniej więcej tak: `percy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

⚠️ **UWAGA:** Token jest poufny - nie udostępniaj go publicznie!

## Krok 4: Dodanie Tokenu do Projektu

### 4.1. Lokalnie (dla testów lokalnych)

**Opcja A: Zmienna środowiskowa w terminalu**

```bash
# Dodaj do ~/.zshrc (macOS) lub ~/.bashrc (Linux)
export PERCY_TOKEN="percy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Załaduj zmiany
source ~/.zshrc  # lub source ~/.bashrc
```

**Opcja B: Plik .env.local**

```bash
# W głównym katalogu projektu
echo "PERCY_TOKEN=percy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" >> .env.local
```

**Opcja C: Bezpośrednio w terminalu (tymczasowo)**

```bash
export PERCY_TOKEN="percy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
npm run test:visual
```

### 4.2. W CI/CD (GitHub Actions)

1. Przejdź do repozytorium na GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Kliknij **"New repository secret"**
4. Wypełnij:
   - **Name**: `PERCY_TOKEN`
   - **Secret**: Wklej swój token z Percy
5. Kliknij **"Add secret"**

## Krok 5: Weryfikacja Konfiguracji

### 5.1. Sprawdź czy Token jest Ustawiony

```bash
# Sprawdź zmienną środowiskową
echo $PERCY_TOKEN

# Powinieneś zobaczyć swój token
```

### 5.2. Uruchom Testy Wizualne

```bash
npm run test:visual
```

### 5.3. Sprawdź Wyniki

- Jeśli wszystko działa, zobaczysz w terminalu link do raportu Percy
- Otwórz link w przeglądarce
- Zobaczysz pierwsze snapshoty (baseline)

## 🎯 Alternatywne Lokalizacje Tokenu

Jeśli nie możesz znaleźć tokenu w ustawieniach projektu, sprawdź:

1. **Dashboard** → **Twoje konto** → **Account Settings** → **API Tokens**
2. **Organizacja** → **Settings** → **API Tokens** (jeśli używasz organizacji)
3. **Projekt** → **Settings** → **General** → **Project Token**

## 🔒 Bezpieczeństwo Tokenu

- ✅ **DOBRZE**: Przechowywać w zmiennych środowiskowych
- ✅ **DOBRZE**: Używać GitHub Secrets w CI/CD
- ✅ **DOBRZE**: Dodać `.env.local` do `.gitignore`
- ❌ **ŹLE**: Commitować token do repozytorium
- ❌ **ŹLE**: Udostępniać token publicznie
- ❌ **ŹLE**: Hardcodować token w kodzie

## 🐛 Rozwiązywanie Problemów

### Problem: "PERCY_TOKEN is not set"

**Rozwiązanie:**
```bash
# Sprawdź czy token jest ustawiony
echo $PERCY_TOKEN

# Jeśli pusty, ustaw go
export PERCY_TOKEN="your-token-here"
```

### Problem: "Invalid token" lub "Unauthorized"

**Rozwiązanie:**
- Sprawdź czy token jest poprawny (skopiowany w całości)
- Upewnij się, że nie ma dodatkowych spacji
- Wygeneruj nowy token w ustawieniach projektu

### Problem: Nie widzę opcji "Project Token"

**Rozwiązanie:**
- Upewnij się, że jesteś właścicielem projektu
- Sprawdź czy projekt został poprawnie utworzony
- Spróbuj odświeżyć stronę (F5)

## 📚 Przydatne Linki

- [Percy.io - Strona główna](https://percy.io)
- [Percy.io - Dokumentacja](https://docs.percy.io)
- [Percy.io - Playwright Integration](https://docs.percy.io/docs/playwright)
- [Percy.io - API Tokens](https://docs.percy.io/docs/api-tokens)

## ✅ Checklist

- [ ] Utworzono konto na Percy.io
- [ ] Utworzono projekt w Percy
- [ ] Skopiowano PERCY_TOKEN
- [ ] Dodano token do zmiennych środowiskowych
- [ ] Uruchomiono pierwsze testy: `npm run test:visual`
- [ ] Sprawdzono raport w dashboardzie Percy
- [ ] (Opcjonalnie) Skonfigurowano token w GitHub Secrets

## 🎉 Gotowe!

Po wykonaniu wszystkich kroków, możesz uruchamiać testy wizualne:

```bash
npm run test:visual
```

Percy automatycznie:
1. Zrobi screenshoty widoków
2. Porówna je z baseline (pierwsza wersja)
3. Wygeneruje raport z różnicami
4. Wyśle link do raportu w terminalu

