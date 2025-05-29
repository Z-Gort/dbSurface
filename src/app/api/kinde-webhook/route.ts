import { NextResponse } from "next/server";
import jwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";
import {
  KindeEventSchema,
  KindeUserSchema,
} from "~/server/inngest/inngestZodSchemas";
import { type z } from "zod";
import Stripe from "stripe";
import { db, users } from "~/server/db";
import { eq } from "drizzle-orm";

const client = jwksClient({
  jwksUri: `${process.env.KINDE_ISSUER_URL}/.well-known/jwks.json`,
});

export async function POST(req: Request) {
  try {
    const token = await req.text();

    const { header } = jwt.decode(token, { complete: true })!;
    const { kid } = header;

    const key = await client.getSigningKey(kid);
    const signingKey = key.getPublicKey();
    const rawEvent = jwt.verify(token, signingKey);
    const event = KindeEventSchema.parse(rawEvent);

    if (event.type === "user.created") {
      const user = KindeUserSchema.parse(event.data);
      await handleUserCreated(user);
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
  }
  return NextResponse.json({ status: 200, statusText: "success" });
}

async function handleUserCreated(user: z.infer<typeof KindeUserSchema>) {
  try {
    console.log("handling create");
    console.log("user", user);
    const userRes = await db
      .select()
      .from(users)
      .where(eq(users.kindeId, user.user.id));

    if (userRes.length > 0) {
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const customer = await stripe.customers.create();

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_FREE_PRICE_ID! }],
    });

    const periodEnd = subscription.items.data[0]!.current_period_end;
    const periodEndDate = new Date(periodEnd * 1_000);

    await db.insert(users).values({
      kindeId: user.user.id,
      stripeId: customer.id,
      subscriptionPeriodEnd: periodEndDate,
    });
  } catch (error) {
    console.log("error", error);
  }
}
