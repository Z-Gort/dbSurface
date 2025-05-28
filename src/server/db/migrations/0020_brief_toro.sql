ALTER TABLE "users" RENAME COLUMN "clerk_id" TO "kinde_id";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_clerk_id_unique";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_kinde_id_unique" UNIQUE("kinde_id");