import { serve } from "inngest/next";
import { subscriptionUpdated } from "~/server/inngest/stripeFunctions";
import { addUser } from "../../../server/inngest/kindeFunctions";
import { inngest } from "../../../server/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [addUser, subscriptionUpdated],
});
