"use client";

import { useEffect, useMemo } from "react";
import { NewProjectionDialog } from "~/components/projections/NewProjectionDialog";
import { Skeleton } from "~/components/ui/skeleton";
import { trpc } from "~/lib/client";
import "~/styles/globals.css";
import { getColumns } from "../../components/projections/Columns";
import { DataTable } from "../../components/projections/DataTable";

export default function Projections() {
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

  const columns = useMemo(() => getColumns(), []);

  const {
    data: activeDbId,
    isLoading: activeDbLoading,
    isSuccess: activeDbSuccess,
  } = trpc.databases.getActiveDb.useQuery();

  const { data: rawData = [], isLoading: projectionsLoading } =
    trpc.projections.listActiveDbProjections.useQuery(
      { databaseId: activeDbId ?? "" },
      { enabled: Boolean(activeDbSuccess) },
    );

  const transformedData = rawData.map((item) => ({
    projection: item.displayName,
    table: `${item.schema}.${item.table}`,
    status: item.status,
    id: item.projectionId,
    points: item.numberPoints,
  }));

  if (activeDbLoading || projectionsLoading) {
    return (
      <div className="mx-auto w-full py-10 pl-5 pr-10">
        <div className="mb-4 flex justify-end">
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[700px] animate-pulse rounded-lg border bg-white shadow">
            <div className="grid grid-cols-4 gap-4 border-b bg-gray-50 p-4">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>

            {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`grid grid-cols-4 gap-4 p-4 ${i < 4 ? "border-b" : ""} `}
              >
                <Skeleton className="h-5 w-full rounded-md" />
                <Skeleton className="h-5 w-full rounded-md" />
                <Skeleton className="h-5 w-12 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      <div className="mx-auto w-full py-10 pl-5 pr-10">
        <div className="mb-4 flex justify-end">
          <NewProjectionDialog
            usedTitles={rawData.map((item) => item.displayName)}
          />
        </div>
        <div className="overscroll-y-contain">
          <DataTable columns={columns} data={transformedData} />
        </div>
      </div>
    </div>
  );
}
