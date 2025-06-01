import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { r2 } from "~/server/db/r2Client";
import { users } from "~/server/db/schema";

export async function getUserIdByKindeId(kindeId: string): Promise<string> {
  const userRes = await db
    .select({ userId: users.userId })
    .from(users)
    .where(eq(users.kindeId, kindeId))
    .execute();

  return userRes[0]!.userId;
}

export async function deleteBucketFolder(bucket: string, folderPath: string) {
  // This function only deletes up to 1000 files at once
  const prefix = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;

  const { Contents } = await r2.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 1000 }),
  );

  if (!Contents?.length) return; // not all projections have files (if they failed in creation)

  await r2.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: Contents.filter((obj) => obj.Key).map((obj) => ({
          Key: obj.Key!,
        })),
        Quiet: true,
      },
    }),
  );
}