# Dokumentacja API - Centrum Logowania

## Uwierzytelnianie API

Wszystkie endpointy `/api/v1/*` wymagają nagłówka `x-api-key` z kluczem API projektu.

```bash
curl -H "x-api-key: cl_XXXXXXXX" https://your-domain.com/api/v1/...
```

## Rate Limiting

Wszystkie endpointy API są chronione przez rate limiting:

| Endpoint                 | Limit   | Okno czasowe |
| ------------------------ | ------- | ------------ |
| `/api/v1/token`          | 30 req  | 1 min        |
| `/api/v1/verify`         | 60 req  | 1 min        |
| `/api/v1/session/verify` | 100 req | 1 min        |

Nagłówki odpowiedzi:

- `X-RateLimit-Remaining` - pozostała liczba requestów
- `X-RateLimit-Reset` - czas resetowania limitu (ISO 8601)
- `Retry-After` - sekundy do ponowienia (przy 429)

---

## Endpointy Autoryzacji

### POST /api/v1/token

Wymienia jednorazowy kod autoryzacyjny na dane użytkownika (OAuth2 flow).

**Request:**

```bash
curl -X POST https://your-domain.com/api/v1/token \
  -H "Content-Type: application/json" \
  -H "x-api-key: cl_XXXXXXXX" \
  -d '{"code": "AUTHORIZATION_CODE", "redirect_uri": "https://your-app.com/callback"}'
```

**Response (sukces):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "role": "user",
    "tokenVersion": 1
  },
  "project": {
    "id": "uuid",
    "name": "My App"
  }
}
```

**Response (błędy):**

- `401` - Missing/Invalid API Key, Invalid/Used authorization code
- `403` - Access denied (izolacja danych - użytkownik nie ma dostępu do projektu)
- `429` - Rate limit exceeded

---

### POST /api/v1/verify

Weryfikuje token JWT (legacy - do weryfikacji tokenów z cookie).

**Request:**

```bash
curl -X POST https://your-domain.com/api/v1/verify \
  -H "Content-Type: application/json" \
  -H "x-api-key: cl_XXXXXXXX" \
  -d '{"token": "eyJ..."}'
```

**Response (sukces):**

```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "role": "user"
  },
  "project": {
    "id": "uuid",
    "name": "My App"
  }
}
```

---

### POST /api/v1/session/verify

Sprawdza czy sesja użytkownika jest nadal ważna (Kill Switch verification).

**Request:**

```bash
curl -X POST https://your-domain.com/api/v1/session/verify \
  -H "Content-Type: application/json" \
  -H "x-api-key: cl_XXXXXXXX" \
  -d '{"userId": "uuid", "tokenVersion": 1}'
```

**Response (sesja ważna):**

```json
{
  "valid": true
}
```

**Response (sesja nieważna):**

```json
{
  "valid": false,
  "reason": "token_version_mismatch" | "user_not_found" | "access_denied"
}
```

---

## Endpointy Zarządzania Projektem

### GET /api/v1/project/[projectId]/members

Pobiera listę członków projektu (tylko dla właściciela).

**Response:**

```json
{
  "members": [
    {
      "id": "uuid",
      "userId": "uuid",
      "role": "member",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
  ]
}
```

---

### POST /api/v1/project/[projectId]/members

Dodaje członka do projektu (dla projektów prywatnych).

**Request:**

```json
{
  "email": "user@example.com",
  "role": "member"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Członek został dodany"
}
```

---

### DELETE /api/v1/project/[projectId]/members/[memberId]

Usuwa członka z projektu.

**Response:**

```json
{
  "success": true,
  "message": "Członek został usunięty"
}
```

---

### PATCH /api/v1/project/[projectId]/visibility

Zmienia widoczność projektu (publiczny/prywatny).

**Request:**

```json
{
  "isPublic": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Projekt jest teraz prywatny"
}
```

---

## Endpointy Audytu

### GET /api/v1/audit-logs

Pobiera logi audytu (wymaga zalogowanego użytkownika).

**Query params:**

- `projectId` (opcjonalny) - filtruj po projekcie
- `limit` (opcjonalny, max 200) - liczba rekordów

**Response:**

```json
{
  "logs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "projectId": "uuid",
      "action": "login",
      "status": "success",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "metadata": "{\"email\":\"user@example.com\"}",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Typy akcji:**

- `login` - Logowanie przez Google
- `logout` - Wylogowanie
- `token_exchange` - Wymiana kodu na token (OAuth2)
- `session_verify` - Weryfikacja sesji
- `token_verify` - Weryfikacja tokenu JWT
- `access_denied` - Odmowa dostępu (izolacja danych)
- `rate_limited` - Przekroczony limit requestów
- `kill_switch` - Unieważnienie sesji przez admina
- `project_access` - Próba/sukces dostępu do projektu

---

## Izolacja Danych

Projekty mogą być **publiczne** lub **prywatne**:

### Projekt Publiczny (domyślnie)

- Każdy użytkownik zarejestrowany w systemie może się zalogować
- Brak konieczności zarządzania członkami

### Projekt Prywatny

- Tylko użytkownicy dodani do tabeli `project_users` mogą się logować
- Zarządzanie członkami przez API lub dashboard
- Próba logowania przez niezaproszonych użytkowników zwraca `403 Access Denied`

---

## Bezpieczeństwo

### Kill Switch

Użytkownik może unieważnić wszystkie sesje poprzez inkrementację `tokenVersion` w bazie.
Aplikacje klienckie powinny okresowo weryfikować sesje przez `/api/v1/session/verify`.

### Audyt

Wszystkie istotne zdarzenia są logowane w tabeli `audit_logs` z informacjami o:

- Użytkowniku (jeśli znany)
- Projekcie (jeśli dotyczy)
- Adresie IP
- User-Agent
- Dodatkowych metadanych (w formacie JSON)
