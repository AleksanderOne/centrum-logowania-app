# Auth SDK dla Centrum Logowania

Proste SDK do integracji Twojej aplikacji frontendowej z Centrum Logowania (SSO).

## Instalacja

Pobierz plik `auth.js` i dołącz go do swojego projektu:

```html
<script src="path/to/auth.js"></script>
```

## Użycie

### 1. Inicjalizacja

```javascript
const auth = new AuthClient({
  clientId: 'twoj-client-id-z-dashboardu', // Wymagane
  authUrl: 'http://localhost:3002', // Opcjonalnie (domyślnie localhost:3002)
  storageKey: 'myapp_token', // Opcjonalnie (klucz w localStorage)
});
```

### 2. Sprawdzenie statusu

```javascript
if (auth.isAuthenticated()) {
  const user = auth.getUser();
  console.log('Zalogowany użytkownik:', user.email);
} else {
  console.log('Niezalogowany');
}
```

### 3. Logowanie i Wylogowanie

```javascript
// Rozpoczyna proces logowania (przekierowanie)
auth.login();

// Wylogowuje (usuwa token i odświeża stronę)
auth.logout();
```

## Funkcje

- **Automatyczna obsługa powrotu**: SDK automatycznie wykrywa token w URL po powrocie z logowania i zapisuje go.
- **Dekodowanie Tokena**: Metoda `getUser()` zwraca gotowy obiekt z danymi użytkownika.
- **Czysty URL**: Token jest automatycznie usuwany z paska adresu przeglądarki po zapisaniu.
