import { serve } from "inngest/next";
import { inngest } from "../../../server/inngest/client";
import { addUser, deleteUser, updateUser } from "../../../server/inngest/clerkFunctions";
import { subscriptionCreated } from "~/server/inngest/stripeFunctions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [addUser, updateUser, deleteUser, subscriptionCreated],
});
