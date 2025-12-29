-- ============================================================================
-- PEŁNY SCHEMAT BAZY DANYCH DLA TESTÓW E2E
-- ============================================================================
-- Ten plik zawiera kompletny schemat bazy danych centrum_logowania.
-- Jest używany przez testy E2E zamiast uruchamiania migracji inkrementalnych.
-- Dzięki temu testy są szybsze i bardziej niezawodne.
-- ============================================================================

-- Tworzenie schematu
CREATE SCHEMA IF NOT EXISTS "centrum_logowania";

-- ============================================================================
-- TABELA: user (Użytkownicy)
-- ============================================================================
CREATE TABLE "centrum_logowania"."user" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text,
    "email" text NOT NULL,
    "emailVerified" timestamp,
    "image" text,
    "password" text,
    "role" text DEFAULT 'user',
    "token_version" integer DEFAULT 1,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "user_email_unique" UNIQUE("email")
);

-- ============================================================================
-- TABELA: account (Konta OAuth)
-- ============================================================================
CREATE TABLE "centrum_logowania"."account" (
    "userId" uuid NOT NULL,
    "type" text NOT NULL,
    "provider" text NOT NULL,
    "providerAccountId" text NOT NULL,
    "refresh_token" text,
    "access_token" text,
    "expires_at" integer,
    "token_type" text,
    "scope" text,
    "id_token" text,
    "session_state" text,
    CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);

ALTER TABLE "centrum_logowania"."account" 
    ADD CONSTRAINT "account_userId_user_id_fk" 
    FOREIGN KEY ("userId") REFERENCES "centrum_logowania"."user"("id") ON DELETE cascade;

-- ============================================================================
-- TABELA: session (Sesje NextAuth)
-- ============================================================================
CREATE TABLE "centrum_logowania"."session" (
    "sessionToken" text PRIMARY KEY NOT NULL,
    "userId" uuid NOT NULL,
    "expires" timestamp NOT NULL,
    "last_activity" timestamp DEFAULT now()
);

ALTER TABLE "centrum_logowania"."session" 
    ADD CONSTRAINT "session_userId_user_id_fk" 
    FOREIGN KEY ("userId") REFERENCES "centrum_logowania"."user"("id") ON DELETE cascade;

CREATE INDEX IF NOT EXISTS "idx_session_last_activity" ON "centrum_logowania"."session" ("last_activity");

-- ============================================================================
-- TABELA: verificationToken (Tokeny weryfikacyjne)
-- ============================================================================
CREATE TABLE "centrum_logowania"."verificationToken" (
    "identifier" text NOT NULL,
    "token" text NOT NULL,
    "expires" timestamp NOT NULL,
    CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);

-- ============================================================================
-- TABELA: project (Projekty/Multi-tenant)
-- ============================================================================
CREATE TABLE "centrum_logowania"."project" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "domain" text,
    "description" text,
    "ownerId" uuid,
    "api_key" text,
    "is_public" text DEFAULT 'true',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "project_slug_unique" UNIQUE("slug"),
    CONSTRAINT "project_api_key_unique" UNIQUE("api_key")
);

ALTER TABLE "centrum_logowania"."project" 
    ADD CONSTRAINT "project_ownerId_user_id_fk" 
    FOREIGN KEY ("ownerId") REFERENCES "centrum_logowania"."user"("id");

-- ============================================================================
-- TABELA: authorization_code (Kody autoryzacyjne OAuth2 + PKCE)
-- ============================================================================
CREATE TABLE "centrum_logowania"."authorization_code" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "code" text NOT NULL,
    "user_id" uuid NOT NULL,
    "project_id" uuid NOT NULL,
    "redirect_uri" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "used_at" timestamp,
    "code_challenge" text,
    "code_challenge_method" text,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "authorization_code_code_unique" UNIQUE("code")
);

ALTER TABLE "centrum_logowania"."authorization_code" 
    ADD CONSTRAINT "authorization_code_user_id_user_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "centrum_logowania"."user"("id") ON DELETE cascade;

ALTER TABLE "centrum_logowania"."authorization_code" 
    ADD CONSTRAINT "authorization_code_project_id_project_id_fk" 
    FOREIGN KEY ("project_id") REFERENCES "centrum_logowania"."project"("id") ON DELETE cascade;

CREATE INDEX IF NOT EXISTS "idx_authorization_code_challenge" ON "centrum_logowania"."authorization_code" ("code_challenge");

-- ============================================================================
-- TABELA: project_session (Sesje projektów)
-- ============================================================================
CREATE TABLE "centrum_logowania"."project_session" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "project_id" uuid NOT NULL,
    "user_email" text NOT NULL,
    "user_name" text,
    "user_agent" text,
    "ip_address" text,
    "last_seen_at" timestamp DEFAULT now(),
    "created_at" timestamp DEFAULT now()
);

ALTER TABLE "centrum_logowania"."project_session" 
    ADD CONSTRAINT "project_session_user_id_user_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "centrum_logowania"."user"("id") ON DELETE cascade;

ALTER TABLE "centrum_logowania"."project_session" 
    ADD CONSTRAINT "project_session_project_id_project_id_fk" 
    FOREIGN KEY ("project_id") REFERENCES "centrum_logowania"."project"("id") ON DELETE cascade;

-- ============================================================================
-- TABELA: project_user (Izolacja danych - dostęp do projektów)
-- ============================================================================
CREATE TABLE "centrum_logowania"."project_user" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "project_id" uuid NOT NULL,
    "role" text DEFAULT 'member',
    "created_at" timestamp DEFAULT now()
);

ALTER TABLE "centrum_logowania"."project_user" 
    ADD CONSTRAINT "project_user_user_id_user_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "centrum_logowania"."user"("id") ON DELETE cascade;

ALTER TABLE "centrum_logowania"."project_user" 
    ADD CONSTRAINT "project_user_project_id_project_id_fk" 
    FOREIGN KEY ("project_id") REFERENCES "centrum_logowania"."project"("id") ON DELETE cascade;

CREATE UNIQUE INDEX IF NOT EXISTS "project_user_unique" ON "centrum_logowania"."project_user" ("user_id", "project_id");

-- ============================================================================
-- TABELA: audit_log (Logi audytowe)
-- ============================================================================
CREATE TABLE "centrum_logowania"."audit_log" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid,
    "project_id" uuid,
    "action" text NOT NULL,
    "status" text NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "metadata" text,
    "created_at" timestamp DEFAULT now()
);

ALTER TABLE "centrum_logowania"."audit_log" 
    ADD CONSTRAINT "audit_log_user_id_user_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "centrum_logowania"."user"("id") ON DELETE set null;

ALTER TABLE "centrum_logowania"."audit_log" 
    ADD CONSTRAINT "audit_log_project_id_project_id_fk" 
    FOREIGN KEY ("project_id") REFERENCES "centrum_logowania"."project"("id") ON DELETE set null;

CREATE INDEX IF NOT EXISTS "audit_log_user_idx" ON "centrum_logowania"."audit_log" ("user_id");
CREATE INDEX IF NOT EXISTS "audit_log_project_idx" ON "centrum_logowania"."audit_log" ("project_id");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "centrum_logowania"."audit_log" ("action");
CREATE INDEX IF NOT EXISTS "audit_log_created_idx" ON "centrum_logowania"."audit_log" ("created_at" DESC);

-- ============================================================================
-- TABELA: rate_limit_entry (Rate limiting)
-- ============================================================================
CREATE TABLE "centrum_logowania"."rate_limit_entry" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "key" text NOT NULL,
    "count" integer DEFAULT 1,
    "window_start" timestamp DEFAULT now(),
    "expires_at" timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "rate_limit_key_idx" ON "centrum_logowania"."rate_limit_entry" ("key");
CREATE INDEX IF NOT EXISTS "rate_limit_expires_idx" ON "centrum_logowania"."rate_limit_entry" ("expires_at");

-- ============================================================================
-- TABELA: project_setup_code (Kody setup - łatwa integracja nowych aplikacji)
-- ============================================================================
CREATE TABLE "centrum_logowania"."project_setup_code" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" uuid NOT NULL,
    "code" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "used_at" timestamp,
    "used_by_ip" text,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "project_setup_code_code_unique" UNIQUE("code")
);

ALTER TABLE "centrum_logowania"."project_setup_code" 
    ADD CONSTRAINT "project_setup_code_project_id_project_id_fk" 
    FOREIGN KEY ("project_id") REFERENCES "centrum_logowania"."project"("id") ON DELETE cascade;

-- ============================================================================
-- KONIEC SCHEMATU
-- ============================================================================
