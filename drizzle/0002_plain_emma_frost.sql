CREATE TABLE "centrum_logowania"."authorization_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"redirect_uri" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "authorization_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "centrum_logowania"."authorization_code" ADD CONSTRAINT "authorization_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "centrum_logowania"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centrum_logowania"."authorization_code" ADD CONSTRAINT "authorization_code_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "centrum_logowania"."project"("id") ON DELETE cascade ON UPDATE no action;