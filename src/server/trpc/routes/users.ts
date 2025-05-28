import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db, users } from "~/server/db";
import { router } from "../trpc";
import { protectedProcedure } from "../trpc";

export const usersRouter = router({
  remainingUsage: protectedProcedure.query(async ({ ctx }) => {
    const { id: kindeId } = ctx.auth;

    const user = await db
      .select()
      .from(users)
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
    const { id: kindeId } = ctx.auth;

    const stripeResult = await db
      .select({ stripeId: users.stripeId })
      .from(users)
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
    const { id: kindeId } = ctx.auth;

    const result = await db
      .select()
      .from(users)
      .where(eq(users.kindeId, kindeId));

    return result[0]!;
  }),
});
