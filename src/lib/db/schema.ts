import { pgSchema, text, timestamp, uuid, integer, primaryKey } from 'drizzle-orm/pg-core';
import { type AdapterAccount } from 'next-auth/adapters';

export const mySchema = pgSchema('centrum_logowania');

// --- Auth Core ---

export const users = mySchema.table('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  password: text('password'), // Dla credentials provider
  role: text('role').default('user'), // user | admin
  tokenVersion: integer('token_version').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const accounts = mySchema.table(
  'account',
  {
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
);

export const sessions = mySchema.table('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = mySchema.table(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// --- Multi-tenancy / Projects ---
// Tabela przechowująca informacje o zewnętrznych aplikacjach (projektach), które korzystają z tego systemu logowania.

export const projects = mySchema.table('project', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // np. "moj-projekt-a"
  domain: text('domain'), // np. "app.mojprojekt.pl" - do walidacji redirectów
  description: text('description'),
  ownerId: uuid('ownerId').references(() => users.id), // Właściciel projektu (admin w tym systemie)
  apiKey: text('api_key').unique(), // Klucz API dla projektu do komunikacji z backendem tego systemu
  isPublic: text('is_public').default('true'), // 'true' = każdy może się logować, 'false' = tylko zaproszeni (project_users)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- OAuth2 Authorization Codes ---
// Jednorazowe kody autoryzacyjne generowane podczas flow SSO.
// Kod jest wymieniany na dane użytkownika przez endpoint /api/v1/token.

export const authorizationCodes = mySchema.table('authorization_code', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(), // Losowy kod (32+ znaków)
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  redirectUri: text('redirect_uri').notNull(), // URL do którego przekierować (dla weryfikacji)
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(), // Kod ważny tylko przez krótki czas (np. 5 min)
  usedAt: timestamp('used_at', { mode: 'date' }), // Null = nieużyty, data = wykorzystany
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Aktywne sesje w projektach ---
// Śledzenie użytkowników zalogowanych na stronach klienckich.
// Aktualizowane przy każdym logowaniu przez SSO.

export const projectSessions = mySchema.table('project_session', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userEmail: text('user_email').notNull(), // Zdenormalizowane dla szybkiego wyświetlania
  userName: text('user_name'), // Zdenormalizowane dla szybkiego wyświetlania
  userAgent: text('user_agent'), // Informacje o przeglądarce
  ipAddress: text('ip_address'), // Adres IP (dla diagnostyki)
  lastSeenAt: timestamp('last_seen_at', { mode: 'date' }).defaultNow(), // Ostatnia aktywność
  createdAt: timestamp('created_at').defaultNow(), // Kiedy sesja powstała
});

// --- Izolacja Danych (Security) ---
// Tabela łącząca użytkowników z projektami do których mają dostęp.
// Jeśli projekt jest "publiczny" (isPublic=true w projects), ta tabela nie jest sprawdzana.
// Dla projektów prywatnych tylko użytkownicy w tej tabeli mogą się logować.

export const projectUsers = mySchema.table('project_user', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  role: text('role').default('member'), // member | admin (w kontekście projektu)
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Audyt Logów (Security) ---
// Historia zdarzeń związanych z uwierzytelnianiem dla celów audytu.

export const auditLogs = mySchema.table('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Może być null jeśli user usunięty
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }), // Może być null dla zdarzeń globalnych
  action: text('action').notNull(), // np. 'login', 'logout', 'token_exchange', 'session_verify', 'access_denied'
  status: text('status').notNull(), // 'success' | 'failure'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata'), // JSON z dodatkowymi danymi (np. reason, error)
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Rate Limiting (Security) ---
// Tabela do śledzenia prób dostępu dla ochrony przed brute force.
// Używana do limitowania requestów per IP/endpoint.

export const rateLimitEntries = mySchema.table('rate_limit_entry', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(), // np. "ip:192.168.1.1:api/v1/token" lub "user:uuid:login"
  count: integer('count').default(1),
  windowStart: timestamp('window_start', { mode: 'date' }).defaultNow(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
});

// --- Setup Codes (dla łatwej integracji nowych aplikacji) ---
// Jednorazowe kody umożliwiające nowym aplikacjom pobranie konfiguracji projektu.
// Kod jest ważny przez 24h i może być użyty tylko raz.

export const projectSetupCodes = mySchema.table('project_setup_code', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(), // np. "setup_abc123xyz..."
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { mode: 'date' }), // null = nieużyty
  usedByIp: text('used_by_ip'), // IP które użyło kodu (dla audytu)
  createdAt: timestamp('created_at').defaultNow(),
});
