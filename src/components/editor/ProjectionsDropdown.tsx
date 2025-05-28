import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { trpc } from "~/lib/client";
import { useTabContext } from "../providers/TabContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { useSidebar } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";

export function ProjectionsDropdown() {
  const { setTab, tab } = useTabContext();
  const { setOpen } = useSidebar();
  const { panelCoords, deckglLoaded, projectionId, projecting } = tab;
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const { data: activeDbId, isLoading: isActiveDbLoading } =
    trpc.databases.getActiveDb.useQuery();

  const { data: rawData = [], isLoading: listProjectionsLoading } =
    trpc.projections.listActiveDbProjections.useQuery(
      { databaseId: activeDbId!, liveOnly: true },
      { enabled: Boolean(activeDbId) },
    );

  const executeQuery = trpc.local.executeQuery.useMutation({
    trpc: {
      context: { source: "local" },
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            {"Project"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-64 w-60 overflow-y-auto">
          <DropdownMenuGroup>
            {isActiveDbLoading ||
            (listProjectionsLoading && activeDbId) ||
            (!deckglLoaded && projecting) ||
            projectionLoading ? (
              <>
                <DropdownMenuItem disabled>
                  <Skeleton className="h-4 w-32 rounded-md" />
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Skeleton className="h-4 w-24 rounded-md" />
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Skeleton className="h-4 w-28 rounded-md" />
                </DropdownMenuItem>
              </>
            ) : activeDbId ? (
              <>
                {rawData.map((item, index) => (
                  <DropdownMenuItem
                    onSelect={async (event) => {
                      if (!projectionId) event.preventDefault();

                      if (item.projectionId === projectionId) return;
                      setProjectionLoading(true);

                      try {
                        const { rows: pkResult } =
                          await executeQuery.mutateAsync({
                            query: `
                      SELECT kcu.column_name
                      FROM information_schema.table_constraints tc
                      JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                       AND tc.table_schema = kcu.table_schema
                      WHERE tc.table_schema = $1
                        AND tc.table_name = $2
                        AND tc.constraint_type = 'PRIMARY KEY'
                      `,
                            params: [item.schema, item.table],
                          });

                        const primaryKeyColumn = pkResult?.[0]?.column_name as
                          | string
                          | undefined;

                        setTab((prev) => ({
                          ...prev,
                          projecting: true,
                          projectionId: item.projectionId,
                          projectionPrimaryKey: primaryKeyColumn,
                          deckglLoaded: false,
                          colorBy: undefined,
                          continuousCols: undefined,
                          hashes: undefined,
                          latency: undefined,
                          ranSimilarity: undefined,
                          precision: undefined,
                          count: undefined,
                          result: "",
                        }));
                        panelCoords.current.vertical = 20;
                      } catch (error) {
                        console.error(error);
                        setErrorDialogOpen(true);
                      } finally {
                        if (!errorDialogOpen) {
                          setOpen(false);
                        }
                        setProjectionLoading(false);
                      }
                    }}
                    key={index}
                  >
                    {item.projectionId === projectionId ? (
                      <strong>{item.displayName}</strong>
                    ) : (
                      item.displayName
                    )}
                  </DropdownMenuItem>
                ))}
                {rawData.length > 0 ? (
                  <DropdownMenuItem
                    onClick={() => {
                      panelCoords.current.vertical = 50;
                      setTab((prev) => ({
                        ...prev,
                        projecting: false,
                        projectionId: undefined,
                        colorBy: undefined,
                        deckglLoaded: false,
                        continuousCols: undefined,
                      }));
                    }}
                    key={rawData.length}
                  >
                    {"None"}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>
                    No live projections in this database
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              <DropdownMenuItem disabled>No active database</DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error Opening Projection</AlertDialogTitle>
            <AlertDialogDescription>
              {
                "Check your local connection is valid and healthy or make sure you have a database selected."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
