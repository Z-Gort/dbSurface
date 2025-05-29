import { NonRetriableError } from "inngest";
import Stripe from "stripe";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { inngest } from "./client";
import { ClerkUpdateAddSchema } from "./inngestZodSchemas";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const addUser = inngest.createFunction(
  { id: "add-user-from-kinde" },
  { event: "kinde/user.created" },
  async ({ event }) => {
    console.log("event", event);
    // const parsed = ClerkUpdateAddSchema.safeParse(event);

    // if (!parsed.success) {
    //   console.error("Invalid event payload", parsed.error);
    //   throw new NonRetriableError("Invalid event payload");
    // }

    // const user = parsed.data.data;
    // const { id } = user;
    // const primaryEmail = user.email_addresses.find(
    //   (e) => e.id === user.primary_email_address_id,
    // );

    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const customer = await stripe.customers.create({
    //   email: primaryEmail!.email_address,
    // });

    // const subscription = await stripe.subscriptions.create({
    //   customer: customer.id,
    //   items: [{ price: process.env.STRIPE_FREE_PRICE_ID! }],
    // });

    // const periodEnd = subscription.items.data[0]!.current_period_end;
    // const periodEndDate = new Date(periodEnd * 1_000);

    // await db.insert(users).values({
    //   clerkId: id,
    //   email: primaryEmail!.email_address,
    //   stripeId: customer.id,
    //   subscriptionPeriodEnd: periodEndDate,
    // });
  },
);