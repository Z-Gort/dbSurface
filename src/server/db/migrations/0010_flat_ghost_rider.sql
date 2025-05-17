ALTER TABLE "projections" ADD COLUMN "display_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "projections" ADD CONSTRAINT "projections_display_name_unique" UNIQUE("display_name");