import { inngest } from "./client";
import { db } from "~/server/db";
import { databases, projections, users } from "~/server/db/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { supabase } from "~/server/db/supabaseClient";
import { deleteBucketFolder } from "~/server/dbUtils";

const EmailAddressSchema = z.object({
  id: z.string(),
  email_address: z.string().email(),
});

const ClerkUserSchema = z.object({
  id: z.string(),
  email_addresses: z.array(EmailAddressSchema),
  primary_email_address_id: z.string(),
});

const ClerkUpdateAddSchema = z.object({
  data: ClerkUserSchema,
});

const ClerkDeleteSchema = z.object({
  data: z.object({
    id: z.string(),
  }),
});

export const addUser = inngest.createFunction(
  { id: "add-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const parsed = ClerkUpdateAddSchema.safeParse(event);

    if (!parsed.success) {
      console.error("Invalid event payload", parsed.error);
      throw new Error("Invalid event payload");
    }

    const user = parsed.data.data;
    const { id } = user;
    const primaryEmail = user.email_addresses.find(
      (e) => e.id === user.primary_email_address_id,
    );

    await db.insert(users).values({
      clerkId: id,
      email: primaryEmail!.email_address,
    });
  },
);

//the only update a user can do (relevant to user info stored in database) is change their primary email adress
export const updateUser = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const parsed = ClerkUpdateAddSchema.safeParse(event);

    if (!parsed.success) {
      console.error("Invalid event payload", parsed.error);
      throw new Error("Invalid event payload");
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
      throw new Error("Invalid event payload");
    }
    const user = parsed.data.data;
    const { id: clerkId } = user;

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    const foundUser = foundUsers[0]!;

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
