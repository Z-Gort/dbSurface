import { TRPCError } from "@trpc/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type PoolConfig } from "pg";
import { z } from "zod";
import { tablesSql } from "~/lib/autocomplete/tables";
import {
  type DatabaseFunction,
  type TableColumn,
} from "~/miscellaneousTypes/types";
import {
  copyHashedIdsSharded,
  measureQueryLatency,
  queryWithRowLimit,
  removeLocalConnection,
  setLocalConnection,
  testLocalConnection
} from "~/server/trpcLocal/localConnectionUtils";
import { publicProcedure, router } from "../trpcLocal";

export const localRouter = router({
  executeQuery: publicProcedure
    .input(
      z.object({
        query: z.string(),
        params: z.array(z.any()).optional(),
        disableLimit: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { query: queryString, params, disableLimit } = input;
        const trimmedQuery = queryString.trim();

        const result = await queryWithRowLimit({
          text: trimmedQuery,
          params,
          disableLimit,
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown database error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMessage,
        });
      }
    }),
  getQueryHashes: publicProcedure
    .input(
      z.object({
        query: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { query: queryString } = input;
      const trimmedQuery = queryString.trim();
      try {
        const hashes = await copyHashedIdsSharded(trimmedQuery, 3);
        return hashes;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown database error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMessage,
        });
      }
    }),
  measureQueryLatency: publicProcedure
    .input(
      z.object({
        query: z.string(),
        params: z.array(z.any()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { query: queryString, params } = input;
        const trimmedQuery = queryString.trim();
        const result = await measureQueryLatency(trimmedQuery, params);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown database error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMessage,
        });
      }
    }),
  validateProjection: publicProcedure
    .input(
      z.object({
        schema: z.string(),
        table: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const res = await testLocalConnection();
      if (!res.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Your local connection health check failed. Check the connection is working or go to the database page to edit it.",
        });
      }

      const { schema, table } = input;

      try {
        //Check table exists, check there is one EMBEDDING column,

        const tableResult = await queryWithRowLimit({
          text: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
        LIMIT 1
        `,
          params: [schema, table],
        });

        if (tableResult.rows.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Table "${schema}.${table}" does not exist.`,
          });
        }

        const columnResult = await queryWithRowLimit({
          text: `
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = $1
              AND table_name = $2
          `,
          params: [schema, table],
        });

        const embeddingColumns = columnResult.rows.filter(
          (col) =>
            col.data_type === "USER-DEFINED" && col.udt_name === "vector",
        );

        if (embeddingColumns.length !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Table "${schema}.${table}" should have exactly one vector column.`,
          });
        }

        const pkResult = await queryWithRowLimit({
          text: `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = $1
          AND tc.table_name = $2
          AND tc.constraint_type = 'PRIMARY KEY'
        `,
          params: [schema, table],
        });

        if (pkResult.rows.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Table "${schema}.${table}" does not have a primary key.`,
          });
        }
        const primaryKeyColumn = pkResult.rows[0]!.column_name as string;

        const countResult = await queryWithRowLimit({
          text: `SELECT COUNT(*) as count
              FROM "${schema}"."${table}"
              WHERE "${primaryKeyColumn}" IS NOT NULL
              `,
        });

        const count = Number(countResult.rows[0]!.count);

        if (count < 10) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Your table must have at least 10 rows to make a projection.`,
          });
        }

        const allColsResult = await queryWithRowLimit({
          text: `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = $1
              AND table_name   = $2
            ORDER BY ordinal_position
          `,
          params: [schema, table],
        });

        const trimmedCols = allColsResult.rows
          .map((col) => col.column_name as string)
          .filter(
            (col) =>
              col !== primaryKeyColumn &&
              col !== embeddingColumns[0]!.column_name,
          );

        return {
          validated: true,
          numberPoints: count,
          primaryKeyColumn: primaryKeyColumn,
          vectorColumn: embeddingColumns[0]!.column_name as string,
          trimmedCols: trimmedCols,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            (error as Error)?.message ??
            "Failed to validate your projection...",
        });
      }
    }),
  setConnection: publicProcedure
    .input(
      z.object({
        dbHost: z.string(),
        dbPort: z.string(),
        dbName: z.string(),
        user: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const config: PoolConfig = {
          user: input.user,
          host: input.dbHost,
          database: input.dbName,
          password: input.password,
          port: parseInt(input.dbPort, 10),
        };
        await setLocalConnection(config);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            (error as Error)?.message ??
            "setConnection failed for an unknown reason.",
        });
      }
    }),
  testConnection: publicProcedure.query(async () => {
    const res = await testLocalConnection();
    if (!res.success) {
      return { success: false, message: res.message ?? "Unkown error" };
    }
    return { success: true, message: "" };
  }),
  removeConnection: publicProcedure.mutation(async () => {
    void removeLocalConnection();
  }),
  getKeywords: publicProcedure.query(async () => {
    const sql = `SELECT word FROM pg_get_keywords();`.trim();

    const result = await queryWithRowLimit<{ word: string }>({
      text: sql,
      disableLimit: true,
    });

    return result.rows.map((x) => x.word.toLocaleLowerCase());
  }),
  getDbFunctions: publicProcedure.query(async () => {
    const functionsSqlPath = join(
      process.cwd(),
      "src",
      "lib",
      "autocomplete",
      "functions.sql",
    );
    const functionsSql = await readFile(functionsSqlPath, "utf-8");
    const enrichedFunctionsSql = `
      WITH f AS (
          ${functionsSql}
        )
        SELECT
          f.*
        FROM f
      `;
    const result = await queryWithRowLimit<DatabaseFunction>({
      text: enrichedFunctionsSql,
      disableLimit: true,
    });

    const filteredFunctions = result.rows.filter(
      (fn) =>
        // Only include functions from user-defined schemas or exclude internal ones
        fn.schema !== "pg_catalog" &&
        fn.schema !== "pg_toast" &&
        fn.language !== "internal",
    );
    return filteredFunctions;
  }),
  getSchemas: publicProcedure.query(async () => {
    const schemasSqlPath = join(
      process.cwd(),
      "src",
      "lib",
      "autocomplete",
      "schemas.sql",
    );
    const schemasSql = await readFile(schemasSqlPath, "utf-8");
    const result = await queryWithRowLimit({
      text: schemasSql,
      disableLimit: true,
    });

    return result.rows;
  }),
  getTables: publicProcedure.query(async () => {
    const result = await queryWithRowLimit({
      text: tablesSql,
      disableLimit: true,
    });

    return result.rows as TableColumn[];
  }),
});
