import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { addUser, deleteUser, updateUser } from "../../../inngest/clerkFunctions";
import { subscriptionCreated } from "~/inngest/stripeFunctions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [addUser, updateUser, deleteUser, subscriptionCreated],
});
