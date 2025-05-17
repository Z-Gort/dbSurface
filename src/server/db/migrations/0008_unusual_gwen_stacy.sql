ALTER TABLE "projections" RENAME COLUMN "projected_schema" TO "schema";--> statement-breakpoint
ALTER TABLE "projections" RENAME COLUMN "projected_table" TO "table";--> statement-breakpoint
ALTER TABLE "projections" DROP COLUMN "projected_column";--> statement-breakpoint
ALTER TABLE "projections" DROP COLUMN "extent";