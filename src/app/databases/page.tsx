"use client";

import { CloudAlert, Edit } from "lucide-react";
import { UpsertConnectionDialog } from "~/components/databases/UpsertConnectionDialog";
import { ConfirmDeleteAlertDialog } from "~/components/projections/ConfirmDeleteAlertDialog";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useToast } from "~/components/hooks/use-toast";
import "~/styles/globals.css";
import { trpc } from "~/lib/client";

export default function Databases() {
  const { toast } = useToast();
  const { data: activeDatabaseId } = trpc.databases.getActiveDb.useQuery();
  const {
    data: dbList,
    isLoading,
    error,
  } = trpc.databases.listUserDatabases.useQuery();
  const trpcContext = trpc.useUtils();
  const deleteDatabase = trpc.databases.deleteDatabase.useMutation({
    onSuccess: async () => {
      await trpcContext.databases.listUserDatabases.invalidate();
    },
  });
  const removeLocalConncetion = trpc.local.removeConnection.useMutation({
    trpc: {
      context: { source: "local" },
    },
  });
  const deleteDatabaseAssets =
    trpc.databases.deleteDatabaseAssets.useMutation();
  const handleDelete = async (databaseId: string) => {
    removeLocalConncetion.mutate();
    deleteDatabaseAssets.mutate({ databaseId });
    await deleteDatabase.mutateAsync({ databaseId });
  };
  const setActiveDb = trpc.databases.setActiveDb.useMutation({
    onSuccess: async () => {
      await trpcContext.databases.getActiveDb.invalidate();
    },
  });
  const setLocalConnection = trpc.local.setConnection.useMutation({
    trpc: {
      context: { source: "local" },
    },
  });

  const handleCardClick = async (
    databaseId: string,
    dbName: string,
    localDbUser: string,
    localDbPassword: string,
    dbPort: string,
    dbHost: string,
  ) => {
    if (databaseId === activeDatabaseId) return;
    await setActiveDb.mutateAsync({ databaseId });
    await setLocalConnection.mutateAsync({
      dbHost: dbHost,
      dbPort: dbPort,
      dbName: dbName,
      user: localDbUser,
      password: localDbPassword,
    });
    toast({
      title: `${dbName} set as your active database.`,
      className: "bg-green-100 text-green-700",
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full py-10 pl-5 pr-10">
        {/* “New Connection” button placeholder in the top-right */}
        <div className="mb-6 flex justify-end">
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>

        {/* Grid of 3 square-ish cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex h-36 animate-pulse flex-col rounded-lg border bg-white p-6 shadow"
            >
              {/* Card header: title + icons */}
              <div className="mb-2 flex items-start justify-between">
                {/* nudge the title down 2px (mt-0.5), icons stay flush top */}
                <Skeleton className="mt-0.5 h-6 w-24 rounded-md" />
                <div className="flex space-x-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              </div>

              {/* Card subtitle / body */}
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    //in this case the page will never load--user internet issue is the most likely cause
    return (
      <div className="mt-20 flex justify-center">
        <div className="max-w-8xl w-full space-y-4 px-5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full py-10 pl-5 pr-10">
      <div className="mb-4 flex justify-end">
        <UpsertConnectionDialog activeDbId={activeDatabaseId} />
      </div>
      {dbList.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dbList.map((database) => (
            <Card
              key={database.databaseId}
              onClick={() =>
                handleCardClick(
                  database.databaseId,
                  database.dbName,
                  database.localDbUser,
                  database.localDbPassword,
                  database.dbPort,
                  database.dbHost,
                )
              }
              className={`cursor-pointer transition-shadow ${
                activeDatabaseId === database.databaseId
                  ? "ring ring-primary"
                  : ""
              }`}
            >
              <CardHeader className="relative">
                {/* Delete and Edit Buttons */}
                <div className="absolute right-2 top-2 flex space-x-2">
                  <div onClick={(e) => e.stopPropagation()}>
                    <ConfirmDeleteAlertDialog
                      onDelete={() => handleDelete(database.databaseId)}
                      title="Are you sure?"
                      description="This will permanently delete all data and projections associated with this database."
                    />
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <UpsertConnectionDialog
                      database={database}
                      activeDbId={activeDatabaseId}
                    >
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </UpsertConnectionDialog>
                  </div>
                </div>
                <CardTitle>{database.dbName}</CardTitle>
                <CardDescription className="break-words">
                  {database.dbHost}:{database.dbPort}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Additional details can be added here */}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-grow flex-col items-center justify-center pt-16">
          <CloudAlert className="h-20 w-20 text-primary" />
          <span>No databases to display.</span>
        </div>
      )}
    </div>
  );
}
