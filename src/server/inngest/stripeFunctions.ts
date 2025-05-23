import { inngest } from "./client";
import { z } from "zod";

const StripeSubscriptionCreated = z.object({
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
    console.log("raw event", event);
    const parsed = StripeSubscriptionCreated.safeParse(event);

    if (!parsed.success) {
      console.error("Invalid event payload", parsed.error);
      throw new Error("Invalid event payload");
    }

    console.log("payload recieved", parsed);
    const customer = parsed.data.data.data.object.customer;
    console.log("customer:", customer);
  },
);
