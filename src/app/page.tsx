"use client";

import { useEffect } from "react";
import { ThreePanels } from "~/components/editor/ThreePanels";
import { trpc } from "~/lib/client";
import "~/styles/globals.css";

const Page = () => {
  const setLocalConnection = trpc.local.setConnection.useMutation({
    trpc: {
      context: { source: "local" },
    },
  });
  const trpcContext = trpc.useUtils();
  useEffect(() => {
    async function initConnection() {
      const activeDbId = await trpcContext.client.databases.getActiveDb.query();
      if (activeDbId) {
        const activeDb = await trpcContext.client.databases.getDbRow.query({
          databaseId: activeDbId,
        });

        await setLocalConnection.mutateAsync({
          dbHost: activeDb!.dbHost,
          dbPort: activeDb!.dbPort,
          dbName: activeDb!.dbName,
          user: activeDb!.localDbUser,
          password: activeDb!.localDbPassword,
        });
      }
    }
    void initConnection();
  }, []);

  return <ThreePanels/>;
};

export default Page;
