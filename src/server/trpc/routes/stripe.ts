import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db, users } from "~/server/db";
import { router } from "../trpc";
import { protectedProcedure } from "../trpc";

export const stripeRouter = router({
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
});
