CREATE TABLE "databases" (
	"database_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"db_host" text NOT NULL,
	"db_port" text NOT NULL,
	"db_name" text NOT NULL,
	"local_db_user" text NOT NULL,
	"local_db_password" text NOT NULL,
	"restricted_db_user" text NOT NULL,
	"restricted_db_password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "two_dim_embeddings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "two_dim_embeddings" CASCADE;--> statement-breakpoint
ALTER TABLE "projections" RENAME COLUMN "high_dim_schema" TO "projected_schema";--> statement-breakpoint
ALTER TABLE "projections" RENAME COLUMN "high_dim_table" TO "projected_table";--> statement-breakpoint
ALTER TABLE "projections" RENAME COLUMN "high_dim_column" TO "projected_column";--> statement-breakpoint
ALTER TABLE "projections" DROP CONSTRAINT "projections_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "projections" ADD COLUMN "database_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "databases" ADD CONSTRAINT "databases_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projections" ADD CONSTRAINT "projections_database_id_databases_database_id_fk" FOREIGN KEY ("database_id") REFERENCES "public"."databases"("database_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projections" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "projections" DROP COLUMN "high_dim_DB";