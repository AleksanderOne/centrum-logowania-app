CREATE TABLE IF NOT EXISTS "centrum_logowania"."audit_log" (
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "centrum_logowania"."project_setup_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"used_by_ip" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "project_setup_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "centrum_logowania"."project_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"role" text DEFAULT 'member',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "centrum_logowania"."rate_limit_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 1,
	"window_start" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "centrum_logowania"."project" ADD COLUMN IF NOT EXISTS "is_public" text DEFAULT 'true';--> statement-breakpoint
ALTER TABLE "centrum_logowania"."audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "centrum_logowania"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centrum_logowania"."audit_log" ADD CONSTRAINT "audit_log_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "centrum_logowania"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centrum_logowania"."project_setup_code" ADD CONSTRAINT "project_setup_code_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "centrum_logowania"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centrum_logowania"."project_user" ADD CONSTRAINT "project_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "centrum_logowania"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centrum_logowania"."project_user" ADD CONSTRAINT "project_user_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "centrum_logowania"."project"("id") ON DELETE cascade ON UPDATE no action;