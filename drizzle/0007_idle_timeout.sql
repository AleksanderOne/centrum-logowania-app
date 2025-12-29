-- Migracja: Idle Session Timeout
-- Dodanie kolumny last_activity do głównej tabeli sesji (NextAuth)
ALTER TABLE "centrum_logowania"."session" ADD COLUMN "last_activity" timestamp DEFAULT now();

-- Indeks dla szybkiego wyszukiwania wygasłych sesji
CREATE INDEX IF NOT EXISTS "idx_session_last_activity" ON "centrum_logowania"."session" ("last_activity");
