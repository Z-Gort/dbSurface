import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { supabase } from "~/server/db/supabaseClient";

export async function getUserIdByClerkId(clerkId: string): Promise<string> {
  const userRes = await db
    .select({ userId: users.userId })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .execute();

  return userRes[0]!.userId;
}

export async function deleteBucketFolder(bucket: string, folderPath: string) {
  const { data } = await supabase.storage.from(bucket).list(folderPath);

  if (!data) { // not all projections have a bucket (if they failed in creation)
    return;
  }

  const filesToDelete = data
    .filter((item) => item.metadata)
    .map((item) => `${folderPath}/${item.name}`);

  const folders = data
    .filter((item) => !item.metadata)
    .map((item) => `${folderPath}/${item.name}`);

  if (filesToDelete.length > 0) {
    await supabase.storage.from(bucket).remove(filesToDelete);
  }

  for (const subfolder of folders) {
    await deleteBucketFolder(bucket, subfolder);
  }
}
