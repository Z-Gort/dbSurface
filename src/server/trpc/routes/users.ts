/* eslint-disable */
/* @ts-nocheck */

import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { databases, db, projections, users } from "~/server/db";
import { deleteUser, getToken } from "~/server/utils/kindeUtils";
import { protectedProcedure, router } from "../trpc";
import { deleteBucketFolder } from "~/server/utils/dbUtils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const usersRouter = router({
  remainingUsage: protectedProcedure.query(async ({ ctx }) => {
    const kindeId = ctx.userId;

    const user = await db
      .select()
      .from(users)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      .where(eq(users.kindeId, kindeId));
    const usedRows = user[0]!.monthlyProjectedRows;
    const usedProjections = user[0]!.monthlyProjections;
    const totalRows = user[0]!.plan === "free" ? 250_000 : 40_000_000;
    const totalProjections = user[0]!.plan === "free" ? 10 : 200;
    const remainingRows = totalRows - usedRows;
    const remainingProjections = totalProjections - usedProjections;

    return { remainingRows, remainingProjections };
  }),
  createCustomerPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const kindeId = ctx.userId;

    const stripeResult = await db
      .select({ stripeId: users.stripeId })
      .from(users)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      .where(eq(users.kindeId, kindeId));

    const stripeId = stripeResult[0]!.stripeId;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeId,
      return_url: "http://localhost:4800/billing",
    });

    return { url: session.url };
  }),
  getUser: protectedProcedure.query(async ({ ctx }) => {
    const kindeId = ctx.userId;

    const result = await db
      .select()
      .from(users)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      .where(eq(users.kindeId, kindeId));

    return result[0]!;
  }),
  deleteUser: protectedProcedure.mutation(async ({ ctx }) => {
    const kindeId = ctx.userId;

    const token = await getToken();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-expect-error
    await deleteUser(kindeId, token);
  }),
  deleteUserAssets: protectedProcedure.mutation(async ({ ctx }) => {
    const kindeId = ctx.userId;
    const userRes = await db
      .select()
      .from(users)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      .where(eq(users.kindeId, kindeId));
    const user = userRes[0]!;

    await stripe.customers.del(user.stripeId); //automatically cancels any subscription

    const userDatabases = await db
      .select()
      .from(databases)
      .where(eq(databases.userId, user.userId));

    for (const database of userDatabases) {
      const dbProjections = await db
        .select()
        .from(projections)
        .where(eq(projections.databaseId, database.databaseId));

      for (const proj of dbProjections) {
        const projectionId = proj.projectionId;
        await deleteBucketFolder("quadtree-tiles", projectionId);
      }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-expect-error
    await db.delete(users).where(eq(users.kindeId, kindeId));
  }),
});
