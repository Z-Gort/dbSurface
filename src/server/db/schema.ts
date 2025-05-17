import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  integer,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  userId: uuid("user_id").primaryKey().defaultRandom().notNull(),
  email: text("email").notNull(),
  activeDb: uuid("active_db").references(
    (): AnyPgColumn => databases.databaseId,
    {
      onDelete: "set null",
    },
  ),
  clerkId: text("clerk_id").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const databases = pgTable("databases", {
  databaseId: uuid("database_id").primaryKey().defaultRandom().notNull(),
  userId: uuid("user_id")
    .references(() => users.userId, { onDelete: "cascade" })
    .notNull(),
  dbHost: text("db_host").notNull(),
  dbPort: text("db_port").notNull(),
  dbName: text("db_name").notNull(),
  localDbUser: text("local_db_user").notNull(),
  localDbPassword: text("local_db_password").notNull(),
  restrictedDbUser: text("restricted_db_user").notNull(),
  restrictedDbPassword: text("restricted_db_password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projections = pgTable("projections", {
  projectionId: uuid("projection_id").primaryKey().defaultRandom().notNull(),
  databaseId: uuid("database_id")
    .references(() => databases.databaseId, { onDelete: "cascade" })
    .notNull(),
  displayName: text("display_name").notNull().unique(),
  schema: text("schema").notNull(),
  table: text("table").notNull(),
  columns: text("columns")
    .array()                                  // makes this a `text[]` in Postgres :contentReference[oaicite:0]{index=0}
    .notNull()
    .default(sql`'{}'::text[]`),   
  numberPoints: integer("number_points").notNull(),
  status: text("status").notNull().default("creating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
