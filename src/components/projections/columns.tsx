import { type ColumnDef, Row } from "@tanstack/react-table";
import { trpc } from "~/lib/client";
import { ConfirmDeleteAlertDialog } from "./ConfirmDeleteAlertDialog";
import EditableProjectionCell from "./EditableProjectionCell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export type Projection = {
  projection: string;
  table: string;
  status: string;
  id: string;
  points: number;
};

export const getColumns = (): ColumnDef<Projection>[] => {
  return [
    {
      accessorKey: "projection",
      header: "Projection",
      cell: ({ row }) => <EditableProjectionCell row={row} />,
    },
    {
      accessorKey: "table",
      header: "Table",
    },
    {
      accessorKey: "points",
      header: "Vector Count",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue() as string;
        let dotColorClass = "bg-gray-500"; // Default color

        if (status === "creating") {
          dotColorClass = "bg-orange-500";
        } else if (status === "live") {
          dotColorClass = "bg-green-500";
        } else if (status === "failed") {
          dotColorClass = "bg-red-500";
        }

        return (
          <div className="flex items-center">
            <span
              className={`inline-block h-2 w-2 rounded-full ${dotColorClass} mr-2`}
            />
            {status}
            {status === "failed" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground bg-transparent text-[10px] font-medium text-muted-foreground"
                      aria-label="Why did this fail?"
                    >
                      ?
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="rounded bg-black p-2 text-white shadow">
                    <p className="max-w-xs text-xs">
                      Creation failure is likely because your restricted
                      connection failed to retrieve rows from your database.
                      Check your restricted connection and database.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",

      cell: ({ row }) => {
        const deleteProjectionMutation =
          trpc.projections.deleteProjection.useMutation();
        const trpcContext = trpc.useUtils();
        const handleDelete = async () => {
          await deleteProjectionMutation.mutateAsync({
            projectionId: row.original.id,
          });
          await trpcContext.projections.listActiveDbProjections.invalidate();
        };

        const isDisabled = row.original.status === "creating";
        return (
          <ConfirmDeleteAlertDialog
            onDelete={handleDelete}
            title="Are you sure?"
            description="This will permanently delete all associated projection data."
            disabled={isDisabled}
          />
        );
      },
    },
  ];
};
