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
--> statement-breakpoint
ALTER TABLE "centrum_logowania"."project_session" ADD CONSTRAINT "project_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "centrum_logowania"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centrum_logowania"."project_session" ADD CONSTRAINT "project_session_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "centrum_logowania"."project"("id") ON DELETE cascade ON UPDATE no action;