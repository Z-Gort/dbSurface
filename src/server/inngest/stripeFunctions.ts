import { eq } from "drizzle-orm";
import { db, users } from "../db";
import { inngest } from "./client";
import { z } from "zod";
import Stripe from "stripe";
import { NonRetriableError } from "inngest";

const subscriptionPayload = z.object({
  data: z.object({
    data: z.object({
      object: z.object({
        customer: z.string(),
      }),
    }),
  }),
});

export const stripeHookEnvelope = z.object({
  raw: z.string(),
  sig: z.string(),
  evt: z.unknown().optional(),
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const subscriptionCreated = inngest.createFunction(
  { id: "stripe-customer-subscription-created" },
  { event: "stripe/customer.subscription.created" },
  async ({ event, logger }) => {
    logger.info("event", event);
    const envParsed = stripeHookEnvelope.safeParse(event.data);
    if (!envParsed.success) {
      throw new NonRetriableError("Malformed Inngest envelope");
    }
    const { raw, sig } = envParsed.data;

    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        Buffer.from(raw, "base64"),
        sig,
        endpointSecret,
      );
    } catch {
      throw new NonRetriableError("Invalid Stripe signature");
    }
    logger.info("evt.data", stripeEvent);
    const payloadParsed = subscriptionPayload.safeParse(stripeEvent);
    if (!payloadParsed.success) {
      // Rare: Stripe changed the shape and your schema is stale
      throw new NonRetriableError("Unexpected Stripe payload shape");
    }
    const sub = payloadParsed.data.data.data.object;
    const customerId = sub.customer;

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
    const envParsed = stripeHookEnvelope.safeParse(event.data);
    if (!envParsed.success) {
      throw new NonRetriableError("Malformed Inngest envelope");
    }
    const { raw, sig } = envParsed.data;

    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = stripe.webhooks.constructEvent(raw, sig, endpointSecret);
    } catch {
      throw new NonRetriableError("Invalid Stripe signature");
    }

    const payloadParsed = subscriptionPayload.safeParse(stripeEvent);
    if (!payloadParsed.success) {
      throw new NonRetriableError("Unexpected Stripe payload shape");
    }
    const sub = payloadParsed.data.data.data.object;
    const customerId = sub.customer;

    await db
      .update(users)
      .set({ plan: "free" })
      .where(eq(users.stripeId, customerId));
  },
);
