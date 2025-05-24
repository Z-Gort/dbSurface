import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db, users } from "~/server/db";
import { router } from "../../trpcLocal/trpcLocal";
import { protectedProcedure } from "../trpc";

export const stripeRouter = router({
  createCustomerPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const { userId: clerkId } = ctx.auth;

    const stripeResult = await db
      .select({ stripeId: users.stripeId })
      .from(users)
      .where(eq(users.clerkId, clerkId));

    const stripeId = stripeResult[0]!.stripeId;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeId,
      return_url: "http://localhost:4800",
    });

    return { url: session.url };
  }),
  createCheckoutSession: protectedProcedure.mutation(async ({ ctx }) => {
    const { userId: clerkId } = ctx.auth;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const stripeResult = await db
      .select({ stripeId: users.stripeId })
      .from(users)
      .where(eq(users.clerkId, clerkId));

    const stripeId = stripeResult[0]!.stripeId;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeId, 
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!, 
          quantity: 1,
        },
      ],
      success_url: "http://localhost:4800/billing",
      cancel_url: "http://localhost:4800/billing",
    });

    return { url: session.url };
  }),
});
