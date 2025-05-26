import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import Stripe from "stripe";
import { type z } from "zod";
import { databases, db, projections, users } from "../db";
import { deleteBucketFolder } from "../dbUtils";
import { inngest } from "./client";
import {
  stripeHookEnvelope,
  subscriptionSchema,
  type TierSwitch
} from "./inngestZodSchemas";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const subscriptionUpdated = inngest.createFunction(
  { id: "stripe-customer-subscription-updated" },
  { event: "stripe/customer.subscription.updated" },
  async ({ event }) => {
    const envParsed = stripeHookEnvelope.safeParse(event.data);
    if (!envParsed.success) {
      throw new NonRetriableError("Malformed Inngest envelope");
    }
    const { raw, sig } = envParsed.data;

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(raw, sig, endpointSecret);
    } catch {
      throw new NonRetriableError("Invalid Stripe signature");
    }

    const payloadParsed = subscriptionSchema.safeParse(stripeEvent);
    if (!payloadParsed.success) {
      throw new NonRetriableError("Unexpected Stripe payload shape");
    }

    const sub = payloadParsed.data.data.object;
    const customerId = sub.customer;
    const priceId = sub.items.data[0].price.id;
    const tier = priceId === process.env.STRIPE_FREE_PRICE_ID ? "free" : "pro";
    const periodEnd = sub.items.data[0].current_period_end;
    const periodEndDate = new Date(periodEnd * 1_000);

    if (didSubscriptionCycle(payloadParsed.data)) {
      await db
        .update(users)
        .set({
          plan: tier,
          subscriptionPeriodEnd: periodEndDate,
          monthlyProjectedRows: 0,
          monthlyProjections: 0,
        })
        .where(eq(users.stripeId, customerId));
    }

    const tierSwitch = getTierSwitch(
      payloadParsed.data,
      process.env.STRIPE_FREE_PRICE_ID!,
      process.env.STRIPE_PRO_PRICE_ID!,
    );

    if (tierSwitch !== "none") {
      console.log("here");
      await db
        .update(users)
        .set({
          plan: tier,
          subscriptionPeriodEnd: periodEndDate,
          monthlyProjectedRows: 0,
          monthlyProjections: 0,
        })
        .where(eq(users.stripeId, customerId));
    }

    if (tierSwitch === "pro_to_free") {
      const foundUsers = await db
        .select()
        .from(users)
        .where(eq(users.stripeId, customerId));

      const foundUser = foundUsers[0]!;

      const userDatabases = await db
        .select()
        .from(databases)
        .where(eq(databases.userId, foundUser.userId));

      for (const database of userDatabases) {
        const dbProjections = await db
          .select()
          .from(projections)
          .where(eq(projections.databaseId, database.databaseId));

        for (const proj of dbProjections) {
          const projectionId = proj.projectionId;
          await deleteBucketFolder("quadtree-tiles", projectionId);
        }
        await db
          .delete(projections)
          .where(eq(projections.databaseId, database.databaseId));
      }
    }
  },
);

function didSubscriptionCycle(
  stripeUpdateEvent: z.infer<typeof subscriptionSchema>,
): boolean {
  //check conditions for subscription cycle
  const sub = stripeUpdateEvent.data.object;
  const prev = stripeUpdateEvent.data.previous_attributes ?? {};

  if (!("latest_invoice" in prev)) return false;

  if (prev.items?.data) {
    const oldItems = prev.items.data;
    const newItems = sub.items.data;

    return oldItems.every((old, idx) => {
      const now = newItems[idx];
      return (
        old.current_period_end === now!.current_period_start &&
        now!.current_period_start > old.current_period_start
      );
    });
  }

  return true;
}

function getTierSwitch(
  stripeUpdateEvent: z.infer<typeof subscriptionSchema>,
  freePriceId: string,
  proPriceId: string,
): TierSwitch {
  const currentPrice = stripeUpdateEvent.data.object.items.data[0].price.id;

  const prevItems = stripeUpdateEvent.data.previous_attributes?.items?.data;
  if (!prevItems) return "none";

  const oldPrice = prevItems[0]!.price.id;
  if (oldPrice === currentPrice) return "none";

  if (oldPrice === freePriceId && currentPrice === proPriceId)
    return "free_to_pro";
  if (oldPrice === proPriceId && currentPrice === freePriceId)
    return "pro_to_free";

  return "none";
}
