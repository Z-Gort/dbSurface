ALTER TABLE "users" ALTER COLUMN "subscription_period_end" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "subscription_period_end" DROP NOT NULL;