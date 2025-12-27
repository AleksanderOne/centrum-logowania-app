# Centrum Logowania SDK v2.1

Proste SDK do integracji aplikacji frontendowej z Centrum Logowania (SSO).
Używa standardowego OAuth2 Authorization Code Flow.

## ✨ Nowe w v2.1

- **Automatyczne wykrywanie URL** - SDK sam wykrywa adres Centrum Logowania!
- **Zero konfiguracji** - wystarczy podać tylko `clientId` i `appId`

## 📦 Instalacja

### Z Centrum Logowania (zalecane)

```html
<!-- SDK automatycznie wykryje adres serwera z którego jest ładowany -->
<script src="https://your-centrum-logowania.com/sdk/auth.js"></script>
```

### Lokalna kopia

```html
<script src="path/to/auth.js" data-auth-url="https://your-centrum-logowania.com"></script>
```

## 🚀 Użycie - Prosty "Wrapper"

Najłatwiejszy sposób - jedna metoda chroni całą aplikację:

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://your-centrum.com/sdk/auth.js"></script>
  </head>
  <body>
    <!-- Ta sekcja będzie ukryta dla niezalogowanych -->
    <div id="my-app" class="hidden">
      <h1>Witaj, <span id="user-email"></span>!</h1>
      <button data-auth-logout>Wyloguj</button>
    </div>

    <script>
      CentrumLogowania.protect({
        clientId: 'twoj-projekt-slug', // Z dashboardu
        appId: 'my-app', // ID elementu do ochrony
        onLogin: (user) => {
          document.getElementById('user-email').textContent = user.email;
        },
      });
    </script>
  </body>
</html>
```

## ⚙️ Konfiguracja

```javascript
CentrumLogowania.protect({
  // WYMAGANE
  clientId: 'twoj-projekt-slug',  // Client ID (slug) z dashboardu
  appId: 'my-app',                // ID elementu HTML do ochrony

  // OPCJONALNE
  authUrl: 'https://...',         // Adres Centrum (auto-wykrywany!)
  onLogin: (user) => { ... },     // Callback po zalogowaniu
});
```

### Automatyczne wykrywanie URL

SDK automatycznie wykrywa adres Centrum Logowania w następującej kolejności:

1. **Atrybut `data-auth-url`** na tagu `<script>`
2. **URL skryptu** - jeśli SDK jest ładowany z `/sdk/auth.js`
3. **Parametr `authUrl`** - jeśli podany w konfiguracji
4. **Bieżący origin** - jako ostateczny fallback

## 📋 API

### Obiekt User

Po zalogowaniu, callback `onLogin` otrzymuje obiekt z danymi użytkownika:

```javascript
{
  id: "uuid",
  email: "user@example.com",
  name: "Jan Kowalski",
  image: "https://..."
}
```

### Wylogowanie

Dodaj atrybut `data-auth-logout` do przycisku:

```html
<button data-auth-logout>Wyloguj</button>
```

### Statyczne metody

```javascript
// Zwraca automatycznie wykryty URL serwera auth
CentrumLogowania.getAuthUrl();
```

## 🔒 Bezpieczeństwo

- SDK używa **OAuth2 Authorization Code Flow**
- Kod autoryzacyjny jest jednorazowy i wygasa po 5 minutach
- Dane użytkownika są przechowywane w `localStorage`
- Weryfikacja `redirect_uri` przy wymianie kodu

## 🛠️ Debugowanie

SDK loguje do konsoli przeglądarki:

```
[CentrumLogowania] Auto-detected auth URL: http://localhost:3000
[CentrumLogowania] Using auth URL: http://localhost:3000
[CentrumLogowania] Użytkownik zalogowany.
```
