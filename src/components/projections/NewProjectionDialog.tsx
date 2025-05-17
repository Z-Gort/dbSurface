import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "~/components/hooks/use-toast";
import { trpc } from "~/lib/client";
import { ErrorDialog } from "./ErrorDialog";

export function NewProjectionDialog({ usedTitles }: { usedTitles: string[] }) {
  const [formData, setFormData] = useState({
    schema: "",
    table: "",
    title: "",
  });
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const trpcContext = trpc.useUtils();

  const { data: activeDbId } = trpc.databases.getActiveDb.useQuery();

  const validateProjectionQuery = trpc.local.validateProjection.useQuery(
    {
      schema: formData.schema,
      table: formData.table,
    },
    {
      enabled: false,
      trpc: { context: { source: "local" } },
    },
  );

  const addProjection = trpc.projections.createProjection.useMutation();

  const pollProjectionStatus = (projectionId: string) => {
    const interval = setInterval(() => {
      void (async () => {
        try {
          const statusResult =
            await trpcContext.client.projections.getProjection.query({
              projectionId,
            });
          if (statusResult.projection.status !== "creating") {
            clearInterval(interval);
            await trpcContext.projections.listActiveDbProjections.invalidate();
            if (statusResult.projection.status === "live") {
              toast({
                title: `Projection ${formData.title} is live.`,
                className: "bg-green-100 text-green-700",
              });
            } else {
              toast({
                title: `Projection ${formData.title} failed.`,
                className: "bg-red-100 text-red-700",
              });
            }
          }
        } catch (error) {
          console.error("Error checking projection status:", error);
          clearInterval(interval);
        }
      })();
    }, 5000);
  };

  const handleNewClick = async () => {
    setIsLoading(true);
    if (!formData.schema || !formData.table || !formData.title) {
      setErrorMessage("All fields are required.");
      setIsLoading(false);
      return;
    }
    if (!activeDbId) {
      setErrorMessage("No database selection active.");
      setIsLoading(false);
      return;
    }

    if (usedTitles.includes(formData.title)) {
      setErrorMessage("Projection title already in use.");
      setIsLoading(false);
      return;
    }

    const validateResult = await validateProjectionQuery.refetch();
    if (validateResult.error) {
      setErrorMessage(validateResult.error.message);
      setIsLoading(false);
      return;
    }

    const dbRow = await trpcContext.client.databases.getDbRow.query({
      databaseId: activeDbId,
    });

    const testResult =
      await trpcContext.client.databases.testRestrictedConnection.query({
        dbHost: dbRow!.dbHost,
        dbPort: dbRow!.dbPort,
        dbName: dbRow!.dbName,
        user: dbRow!.restrictedDbUser,
        password: dbRow!.restrictedDbPassword,
      });

    if (!testResult.success) {
      setErrorMessage(
        "Restricted connection health check failed. Check your restricted connection is working or go to the database page to edit it.",
      );
      setIsLoading(false);
      return;
    }

    const newProjection = await addProjection.mutateAsync({
      databaseId: activeDbId,
      schema: formData.schema,
      table: formData.table,
      numberPoints: validateResult.data!.numberPoints,
      primaryKeyColumn: validateResult.data!.primaryKeyColumn,
      vectorColumn: validateResult.data!.vectorColumn,
      displayName: formData.title,
      trimmedCols: validateResult.data!.trimmedCols,
    });

    await trpcContext.projections.listActiveDbProjections.invalidate();
    pollProjectionStatus(newProjection.projectionId);
    setOpen(false);
    setIsLoading(false);
    return;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 py-2 pl-3 pr-4"
          >
            <Plus />
            New Projection
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Projection</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>Select a table with a vector column to make a projection.</p>
                <p>
                  {" "}
                  <span className="font-semibold">Note:</span> This can take a
                  few minutes. Modifying your table schema while the projection
                  is being created may cause issues. Ensure that your database
                  is prepared to have the full vector table queried.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Display&nbsp;Name
              </Label>
              <Input
                id="table"
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Schema
              </Label>
              <Input
                id="schema"
                onChange={(e) =>
                  setFormData({ ...formData, schema: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Table
              </Label>
              <Input
                id="table"
                onChange={(e) =>
                  setFormData({ ...formData, table: e.target.value })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleNewClick} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {errorMessage && (
        <ErrorDialog
          errorMessage={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}
    </>
  );
}
