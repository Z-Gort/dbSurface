import { eq } from "drizzle-orm";
import { databases, db, projections, users } from "../db";
import { inngest } from "./client";
import { z } from "zod";
import Stripe from "stripe";
import { NonRetriableError } from "inngest";
import { deleteBucketFolder } from "../dbUtils";
import { invoicePaidSchema, stripeHookEnvelope, subscriptionSchema } from "./zodSchemas";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const subscriptionCreated = inngest.createFunction(
  { id: "stripe-customer-subscription-created" },
  { event: "stripe/customer.subscription.created" },
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

    await db
      .update(users)
      .set({ plan: "free" })
      .where(eq(users.stripeId, customerId));

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.stripeId, customerId));

    if (foundUsers.length === 0) {
      return; //this event must have been triggered by a customer deletion
    }

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
  },
);

export const invoicePaid = inngest.createFunction(
  { id: "stripe-invoice-paid" },
  { event: "stripe/invoice.paid" },
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

    const payloadParsed = invoicePaidSchema.safeParse(stripeEvent);
    if (!payloadParsed.success) {
      throw new NonRetriableError("Unexpected Stripe payload shape");
    }
    const invoice = payloadParsed.data.data.object;
    const customerId = invoice.customer;
    const periodEnd = invoice.period_end;
    const periodEndDate = new Date(periodEnd * 1_000);

    await db
      .update(users)
      .set({ subscriptionPeriodEnd: periodEndDate, monthlyProjectedRows: 0, monthlyProjections: 0 })
      .where(eq(users.stripeId, customerId));
  },
);
