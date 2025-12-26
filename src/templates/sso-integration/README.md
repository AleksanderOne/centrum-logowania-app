# SSO Integration Template

Ten folder zawiera wszystkie pliki potrzebne do integracji z Centrum Logowania.

## Szybki start (5 kroków)

### 1. Skopiuj pliki do swojej aplikacji

```bash
# Z katalogu centrum-logowania-app
cp -r src/templates/sso-integration/lib/* YOUR_APP/lib/
cp -r src/templates/sso-integration/app/* YOUR_APP/app/
cp src/templates/sso-integration/middleware.ts YOUR_APP/
```

### 2. Dodaj zmienne środowiskowe

```env
# .env.local
SSO_CENTER_URL=https://centrum-logowania-app-y7gt.vercel.app
SSO_CLIENT_ID=twoj-projekt-slug
SSO_API_KEY=twoj_api_key_z_dashboardu

# Dla client-side (strona logowania)
NEXT_PUBLIC_SSO_CENTER_URL=https://centrum-logowania-app-y7gt.vercel.app
NEXT_PUBLIC_SSO_CLIENT_ID=twoj-projekt-slug
```

### 3. Utwórz projekt w Centrum Logowania

1. Zaloguj się do [Centrum Logowania](https://centrum-logowania-app-y7gt.vercel.app)
2. Przejdź do Dashboard
3. Stwórz nowy projekt (np. "moja-aplikacja")
4. Skopiuj **Client ID** (slug) i **API Key**

### 4. Dodaj tabelę users do swojej bazy

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image TEXT,
    role VARCHAR(20) DEFAULT 'user',
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

Lub z Drizzle ORM (szablon w `lib/db/schema-user.ts`).

### 5. Użyj funkcji auth() w swoich komponentach

```tsx
import { auth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <div>Witaj, {session.user.name}!</div>;
}
```

---

## Struktura plików

```
lib/
├── sso-client.ts      # Cała logika SSO (konfiguracja, sesja, API)
└── auth.ts            # Funkcja auth() do użycia w komponentach

app/
├── api/auth/
│   ├── sso-callback/route.ts   # Callback OAuth2 (tworzy lokalnego usera)
│   └── sso-logout/route.ts     # Wylogowanie
├── (auth)/
│   └── login/page.tsx          # Strona logowania
├── error.tsx                   # Error boundary (ładne błędy)
└── global-error.tsx            # Global error boundary

middleware.ts               # Ochrona tras (Edge Runtime)
```

---

## Dostosowanie

### Zmiana chronionych tras

Edytuj `middleware.ts`:

```typescript
const protectedPaths = [
  '/dashboard',
  '/profile',
  '/admin',
  // Dodaj swoje trasy
];
```

### Dodanie własnych pól do użytkownika

Rozszerz schemat w swojej bazie i zaktualizuj callback w `app/api/auth/sso-callback/route.ts`.

### Wylogowanie

```tsx
import { logout } from '@/app/actions/auth-actions';

<form action={logout}>
  <button type="submit">Wyloguj</button>
</form>;
```

---

## API Centrum Logowania

| Endpoint                      | Opis                             |
| ----------------------------- | -------------------------------- |
| `GET /authorize`              | Redirect do logowania            |
| `POST /api/v1/token`          | Wymiana kodu na dane użytkownika |
| `POST /api/v1/session/verify` | Weryfikacja Kill Switch          |

---

## Troubleshooting

### Błąd "Invalid API Key"

- Sprawdź czy SSO_API_KEY jest poprawny
- Sprawdź czy projekt istnieje w centrum

### Błąd "Invalid or expired code"

- Kod autoryzacyjny jest jednorazowy
- Sprawdź czy redirect_uri się zgadza

### Użytkownik nie widzi sesji

- Sprawdź ciasteczko `sso-session` w DevTools
- Sprawdź czy `auth()` jest wywoływane po stronie serwera
