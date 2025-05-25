import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { databases, projections, users } from "~/server/db/schema";
import { deleteBucketFolder } from "~/server/dbUtils";
import { inngest } from "./client";
import Stripe from "stripe";
import { NonRetriableError } from "inngest";
import { ClerkDeleteSchema, ClerkUpdateAddSchema } from "./inngestZodSchemas";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const addUser = inngest.createFunction(
  { id: "add-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const parsed = ClerkUpdateAddSchema.safeParse(event);

    if (!parsed.success) {
      console.error("Invalid event payload", parsed.error);
      throw new NonRetriableError("Invalid event payload");
    }

    const user = parsed.data.data;
    const { id } = user;
    const primaryEmail = user.email_addresses.find(
      (e) => e.id === user.primary_email_address_id,
    );

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const customer = await stripe.customers.create({
      email: primaryEmail!.email_address,
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_FREE_PRICE_ID! }],
    });

    const periodEnd = subscription.items.data[0]!.current_period_end;
    const periodEndDate = new Date(periodEnd * 1_000);

    await db.insert(users).values({
      clerkId: id,
      email: primaryEmail!.email_address,
      stripeId: customer.id,
      subscriptionPeriodEnd: periodEndDate,
    });
  },
);

//the only update a user can do (relevant to user info stored in database) is change their primary email address
export const updateUser = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const parsed = ClerkUpdateAddSchema.safeParse(event);

    if (!parsed.success) {
      console.error("Invalid event payload", parsed.error);
      throw new NonRetriableError("Invalid event payload");
    }

    const user = parsed.data.data;
    const { id } = user;
    const primaryEmail = user.email_addresses.find(
      (e) => e.id === user.primary_email_address_id,
    );

    await db
      .update(users)
      .set({ email: primaryEmail!.email_address })
      .where(eq(users.clerkId, id));
  },
);

export const deleteUser = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const parsed = ClerkDeleteSchema.safeParse(event);

    if (!parsed.success) {
      console.error("Invalid event payload", parsed.error);
      throw new NonRetriableError("Invalid event payload");
    }
    const user = parsed.data.data;
    const { id: clerkId } = user;

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    const foundUser = foundUsers[0]!;

    await stripe.customers.del(foundUser.stripeId); //automatically cancels any subscription

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
    }

    await db.delete(users).where(eq(users.clerkId, clerkId));
  },
);
