import { serve } from "inngest/next";
import { subscriptionUpdated } from "~/server/inngest/stripeFunctions";
import { inngest } from "../../../server/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [subscriptionUpdated],
});
