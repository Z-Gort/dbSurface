import { serve } from "inngest/next";
import { subscriptionUpdated } from "~/server/inngest/stripeFunctions";
import { addUser, deleteUser, updateUser } from "../../../server/inngest/clerkFunctions";
import { inngest } from "../../../server/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [addUser, updateUser, deleteUser, subscriptionUpdated],
});
