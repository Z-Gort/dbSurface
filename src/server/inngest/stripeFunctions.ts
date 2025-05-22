import { inngest } from "./client";
import { z } from "zod";

const StripeSubscriptionCreated = z.object({
  //only handling customers for now
  customer: z.string(),
});

export const subscriptionCreated = inngest.createFunction(
  { id: "stripe-customer-subscription-created" },
  { event: "stripe/customer.subscription.created" },
  async ({ event }) => {
    console.log("raw event", event)
    const parsed = StripeSubscriptionCreated.safeParse(event);

    if (!parsed.success) {
      console.error("Invalid event payload", parsed.error);
      throw new Error("Invalid event payload");
    }

    console.log("payload recieved.", parsed)

    
  },
);
