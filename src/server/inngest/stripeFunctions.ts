import { eq } from "drizzle-orm";
import { db, users } from "../db";
import { inngest } from "./client";
import { z } from "zod";

const Subscription = z.object({
  data: z.object({
    data: z.object({
      object: z.object({
        customer: z.string(),
      }),
    }),
  }),
});

export const subscriptionCreated = inngest.createFunction(
  { id: "stripe-customer-subscription-created" },
  { event: "stripe/customer.subscription.created" },
  async ({ event }) => {
    const parsed = Subscription.safeParse(event);

    if (!parsed.success) {
      console.error("Invalid event payload", parsed.error);
      throw new Error("Invalid event payload");
    }

    const customerId = parsed.data.data.data.object.customer;

    await db
      .update(users)
      .set({ plan: "pro" })
      .where(eq(users.stripeId, customerId));
  },
);

export const subscriptionDeleted = inngest.createFunction(
  { id: "stripe-customer-subscription-deleted" },
  { event: "stripe/customer.subscription.deleted" },
  async ({ event }) => {
    const parsed = Subscription.safeParse(event);

    if (!parsed.success) {
      console.error("Invalid event payload", parsed.error);
      throw new Error("Invalid event payload");
    }

    const customerId = parsed.data.data.data.object.customer;

    await db
      .update(users)
      .set({ plan: "free" })
      .where(eq(users.stripeId, customerId));
  },
);
