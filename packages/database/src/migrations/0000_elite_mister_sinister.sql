CREATE TYPE "public"."languageS" AS ENUM('BN', 'EN');--> statement-breakpoint
CREATE TYPE "public"."report_categories" AS ENUM('MEDICAL', 'FIRE', 'ACCIDENT', 'CRIME', 'FLOOD', 'UTILITY', 'PUBLIC_SERVICE', 'INFRASTRUCTURE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('PENDING', 'IN_REVIEW', 'ASSIGNED', 'RESOLVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'USER');--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user" uuid NOT NULL,
	"location" varchar(255) NOT NULL,
	"geo_location" jsonb,
	"language" "languageS" DEFAULT 'BN' NOT NULL,
	"description" varchar(500) NOT NULL,
	"category" "report_categories" NOT NULL,
	"urgency" varchar,
	"summary" varchar,
	"suggested_action" varchar,
	"confidence" numeric,
	"status" "report_status" DEFAULT 'PENDING' NOT NULL,
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "reports_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"password" varchar(255),
	"contact" varchar(20),
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_id_unique" UNIQUE("id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "password_max_length_check" CHECK (length("users"."password") <= 255)
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_users_id_fk" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;