-- Migracja: Funkcje bezpieczeństwa
-- Dodaje tabele dla izolacji danych, audytu logów i rate limiting

-- 1. Dodanie kolumny isPublic do tabeli projects
ALTER TABLE "centrum_logowania"."project" ADD COLUMN IF NOT EXISTS "is_public" text DEFAULT 'true';

-- 2. Tabela project_users - izolacja danych (dostęp użytkowników do projektów)
CREATE TABLE IF NOT EXISTS "centrum_logowania"."project_user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "centrum_logowania"."user"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "centrum_logowania"."project"("id") ON DELETE CASCADE,
  "role" text DEFAULT 'member',
  "created_at" timestamp DEFAULT now()
);

-- Indeks dla szybkiego sprawdzania dostępu
CREATE UNIQUE INDEX IF NOT EXISTS "project_user_unique" ON "centrum_logowania"."project_user" ("user_id", "project_id");

-- 3. Tabela audit_logs - historia zdarzeń
CREATE TABLE IF NOT EXISTS "centrum_logowania"."audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "centrum_logowania"."user"("id") ON DELETE SET NULL,
  "project_id" uuid REFERENCES "centrum_logowania"."project"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "status" text NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "metadata" text,
  "created_at" timestamp DEFAULT now()
);

-- Indeksy dla szybkiego wyszukiwania logów
CREATE INDEX IF NOT EXISTS "audit_log_user_idx" ON "centrum_logowania"."audit_log" ("user_id");
CREATE INDEX IF NOT EXISTS "audit_log_project_idx" ON "centrum_logowania"."audit_log" ("project_id");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "centrum_logowania"."audit_log" ("action");
CREATE INDEX IF NOT EXISTS "audit_log_created_idx" ON "centrum_logowania"."audit_log" ("created_at" DESC);

-- 4. Tabela rate_limit_entries - ochrona przed brute force
CREATE TABLE IF NOT EXISTS "centrum_logowania"."rate_limit_entry" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "count" integer DEFAULT 1,
  "window_start" timestamp DEFAULT now(),
  "expires_at" timestamp NOT NULL
);

-- Indeks dla szybkiego wyszukiwania po kluczu
CREATE INDEX IF NOT EXISTS "rate_limit_key_idx" ON "centrum_logowania"."rate_limit_entry" ("key");
CREATE INDEX IF NOT EXISTS "rate_limit_expires_idx" ON "centrum_logowania"."rate_limit_entry" ("expires_at");

