ALTER TABLE "users" DROP CONSTRAINT "password_max_length_check";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "password_max_length_check" CHECK (length("users"."password") <= 255);