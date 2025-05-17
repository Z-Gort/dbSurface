"use client";

import { useEffect } from "react";
import { ThreePanels } from "~/components/editor/ThreePanels";
import { trpc } from "~/lib/client";
import "~/styles/globals.css";

const Page = () => {
  //for this page we don't load until local connection is set...
  //there's just have an error message for the case the user tries to make a query incredibly quickly
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
        try {
          await setLocalConnection.mutateAsync({
            dbHost: activeDb!.dbHost,
            dbPort: activeDb!.dbPort,
            dbName: activeDb!.dbName,
            user: activeDb!.localDbUser,
            password: activeDb!.localDbPassword,
          });
        } catch (error) {
          console.log("error", error);
        }
      }
    }
    void initConnection();
  }, []);

  return <ThreePanels />;
};

export default Page;
