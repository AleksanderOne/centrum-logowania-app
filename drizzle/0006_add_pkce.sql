-- Migracja: Dodanie obsługi PKCE (Proof Key for Code Exchange)
ALTER TABLE "centrum_logowania"."authorization_code" ADD COLUMN "code_challenge" text;
ALTER TABLE "centrum_logowania"."authorization_code" ADD COLUMN "code_challenge_method" text;
CREATE INDEX IF NOT EXISTS "idx_authorization_code_challenge" ON "centrum_logowania"."authorization_code" ("code_challenge");
