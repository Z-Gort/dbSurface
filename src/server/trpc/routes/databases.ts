import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { asc } from "drizzle-orm";
import { and, eq, isNotNull } from "drizzle-orm/expressions";
import { type PoolConfig } from "pg";
import { z } from "zod";
import { db } from "~/server/db";
import { r2 } from "~/server/db/r2Client";
import { databases, projections, users } from "~/server/db/schema";
import { deleteBucketFolder, getUserIdByClerkId } from "~/server/dbUtils";
import { testRemoteConnection } from "~/server/trpc/remoteConnectionUtils";
import { protectedProcedure, router } from "../trpc";

export const databasesRouter = router({
  upsertDbConnection: protectedProcedure
    .input(
      z.object({
        databaseId: z.string().optional(),
        dbHost: z.string(),
        dbPort: z.string(),
        dbName: z.string(),
        localDbUser: z.string(),
        localDbPassword: z.string(),
        restrictedDbUser: z.string(),
        restrictedDbPassword: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.databaseId) {
        await db
          .update(databases)
          .set({
            dbHost: input.dbHost,
            dbPort: input.dbPort,
            dbName: input.dbName,
            localDbUser: input.localDbUser,
            localDbPassword: input.localDbPassword,
            restrictedDbUser: input.restrictedDbUser,
            restrictedDbPassword: input.restrictedDbPassword,
          })
          .where(eq(databases.databaseId, input.databaseId));
        return {
          success: true,
          action: "updated",
          databaseId: input.databaseId,
        };
      } else {
        const { userId: clerkId } = ctx.auth;
        const userId = await getUserIdByClerkId(clerkId);

        const result = await db
          .insert(databases)
          .values({
            userId: userId,
            dbHost: input.dbHost,
            dbPort: input.dbPort,
            dbName: input.dbName,
            localDbUser: input.localDbUser,
            localDbPassword: input.localDbPassword,
            restrictedDbUser: input.restrictedDbUser,
            restrictedDbPassword: input.restrictedDbPassword,
          })
          .returning({ databaseId: databases.databaseId });

        return {
          databaseId: result[0]!.databaseId,
        };
      }
    }),
  listUserDatabases: protectedProcedure.query(async ({ ctx }) => {
    const { userId: clerkId } = ctx.auth;
    const userId = await getUserIdByClerkId(clerkId);

    const results = await db
      .select({
        databaseId: databases.databaseId,
        dbHost: databases.dbHost,
        dbPort: databases.dbPort,
        dbName: databases.dbName,
        localDbUser: databases.localDbUser,
        localDbPassword: databases.localDbPassword,
        restrictedDbUser: databases.restrictedDbUser,
        restrictedDbPassword: databases.restrictedDbPassword,
        createdAt: databases.createdAt,
      })
      .from(databases)
      .where(eq(databases.userId, userId))
      .orderBy(asc(databases.createdAt))
      .execute();

    return results;
  }),
  deleteDatabase: protectedProcedure
    .input(
      z.object({
        databaseId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .delete(databases)
        .where(eq(databases.databaseId, input.databaseId));
    }),
  deleteDatabaseAssets: protectedProcedure
    .input(
      z.object({
        databaseId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      const dbProjections = await db
        .select()
        .from(projections)
        .where(eq(projections.databaseId, input.databaseId));

      for (const proj of dbProjections) {
        const projectionId = proj.projectionId;
        await deleteBucketFolder("quadtree-tiles", projectionId);
      }
    }),
  testRestrictedConnection: protectedProcedure
    .input(
      z.object({
        dbHost: z.string(),
        dbPort: z.string(),
        dbName: z.string(),
        user: z.string(),
        password: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const config: PoolConfig = {
        user: input.user,
        host: input.dbHost,
        database: input.dbName,
        password: input.password,
        port: parseInt(input.dbPort, 10),
      };
      const res = await testRemoteConnection(config);
      if (!res.success) {
        return { success: false, message: res.message ?? "Unkown error" };
      }
      return { success: true, message: "" };
    }),
  setActiveDb: protectedProcedure
    .input(
      z.object({
        databaseId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId } = ctx.auth;
      try {
        await db
          .update(users)
          .set({
            activeDb: input.databaseId,
          })
          .where(eq(users.clerkId, userId));
      } catch (error) {
        console.log("getactivedb error", error);
      }
    }),
  getActiveDb: protectedProcedure.query(
    async ({ ctx }): Promise<string | null> => {
      const { userId } = ctx.auth;
      try {
        // Fetch the user record with a non-null activeDb value.
        const result = await db
          .select()
          .from(users)
          .where(and(eq(users.clerkId, userId), isNotNull(users.activeDb)));
        return result[0]?.activeDb ?? null;
      } catch (error) {
        console.log("getactivedb error", error, error.message);
      }
      return "pol";
    },
  ),
  getDbRow: protectedProcedure
    .input(
      z.object({
        databaseId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(databases)
        .where(eq(databases.databaseId, input.databaseId));

      return result[0];
    }),
  createSignedUrls: protectedProcedure
    .input(
      z.object({
        remotePaths: z.string().array(),
        bucket: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const signedUrls = await Promise.all(
        input.remotePaths.map(async (key) => {
          const cmd = new GetObjectCommand({
            Bucket: input.bucket,
            Key: key,
          });

          const url = await getSignedUrl(r2, cmd, {
            expiresIn: 60 * 60 * 90,
          });

          return { path: key, signedUrl: url };
        }),
      );

      return signedUrls;
    }),
});
