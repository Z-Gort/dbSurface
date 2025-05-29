import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm/expressions";
import { z } from "zod";
import { reduceColumn } from "~/server/utils/callReduce";
import { db } from "~/server/db";
import { projections, users } from "~/server/db/schema";
import { deleteBucketFolder } from "~/server/utils/dbUtils";
import { protectedProcedure, router } from "../trpc";
import { sql, asc } from "drizzle-orm";

export const projectionsRouter = router({
  deleteProjection: protectedProcedure
    .input(
      z.object({
        projectionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .delete(projections)
        .where(eq(projections.projectionId, input.projectionId));

      await deleteBucketFolder("quadtree-tiles", input.projectionId);
    }),
  listActiveDbProjections: protectedProcedure
    .input(
      z.object({
        databaseId: z.string(),
        liveOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { databaseId, liveOnly } = input;
      if (!databaseId) {
        return [];
      }
      const results = await db
        .select({
          schema: projections.schema,
          table: projections.table,
          displayName: projections.displayName,
          numberPoints: projections.numberPoints,
          status: projections.status,
          projectionId: projections.projectionId,
          createdAt: projections.createdAt,
        })
        .from(projections)
        .where(
          and(
            eq(projections.databaseId, databaseId),
            liveOnly ? eq(projections.status, "live") : sql`TRUE`,
          ),
        )
        .orderBy(asc(projections.createdAt))
        .execute();

      return results;
    }),
  createProjection: protectedProcedure
    .input(
      z.object({
        databaseId: z.string(),
        schema: z.string(),
        table: z.string(),
        primaryKeyColumn: z.string(),
        numberPoints: z.number(),
        vectorColumn: z.string(),
        displayName: z.string(),
        remainingRows: z.number(),
        trimmedCols: z.array(z.string()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id: kindeId } = ctx.auth;
      const {
        databaseId,
        schema,
        table,
        numberPoints,
        primaryKeyColumn,
        vectorColumn,
        displayName,
        trimmedCols,
        remainingRows,
      } = input;

      await db
        .update(users)
        .set({
          monthlyProjections: sql`${users.monthlyProjections} + 1`,
          monthlyProjectedRows: sql`${users.monthlyProjectedRows} + ${numberPoints}`,
        })
        .where(eq(users.kindeId, kindeId));

      const [insertedProjection] = await db
        .insert(projections)
        .values({
          displayName: displayName,
          databaseId: databaseId,
          schema: schema,
          table: table,
          numberPoints: numberPoints,
          columns: trimmedCols,
          status: "creating",
        })
        .returning({ projectionId: projections.projectionId });

      reduceColumn({
        schema,
        table,
        vectorColumn,
        primaryKeyColumn,
        projectionId: insertedProjection!.projectionId,
        numberPoints,
        databaseId,
        remainingRows,
      });

      return { projectionId: insertedProjection!.projectionId };
    }),
  getProjection: protectedProcedure
    .input(
      z.object({
        projectionId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { projectionId } = input;
      if (!projectionId) {
        return { projection: null };
      }

      const [foundProjection] = await db
        .select({
          schema: projections.schema,
          table: projections.table,
          numberPoints: projections.numberPoints,
          status: projections.status,
          projectionId: projections.projectionId,
          columns: projections.columns,
        })
        .from(projections)
        .where(eq(projections.projectionId, projectionId));

      if (!foundProjection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projection not found",
        });
      }

      return { projection: foundProjection };
    }),
  updateProjection: protectedProcedure
    .input(
      z.object({
        projectionId: z.string().uuid(),
        newName: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { projectionId, newName } = input;

      await db
        .update(projections)
        .set({ displayName: newName })
        .where(eq(projections.projectionId, projectionId))
        .execute();
    }),
});
