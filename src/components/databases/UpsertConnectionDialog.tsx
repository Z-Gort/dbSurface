import { Plus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useToast } from "~/components/hooks/use-toast";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { trpc } from "~/lib/client";
import { ErrorDialog } from "../projections/ErrorDialog";

export interface Database {
  databaseId: string;
  dbHost: string;
  dbPort: string;
  dbName: string;
  localDbUser: string;
  localDbPassword: string;
  restrictedDbUser: string;
  restrictedDbPassword: string;
}

export interface NewConnectionDialogProps {
  database?: Database;
  children?: React.ReactNode;
  activeDbId?: string | null;
}

export function UpsertConnectionDialog({
  database,
  children,
  activeDbId,
}: NewConnectionDialogProps) {
  const [open, setOpen] = useState(false);
  const initialFormValues = {
    dbHost: database?.dbHost ?? "",
    dbPort: database?.dbPort ?? "",
    dbName: database?.dbName ?? "",
    localDbUser: database?.localDbUser ?? "",
    localDbPassword: database?.localDbPassword ?? "",
    restrictedDbUser: database?.restrictedDbUser ?? "",
    restrictedDbPassword: database?.restrictedDbPassword ?? "",
  };
  const [formData, setFormData] = useState(initialFormValues);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trpcContext = trpc.useUtils();

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setFormData(initialFormValues);
    }
  }, [open]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const upsertDbConnection = trpc.databases.upsertDbConnection.useMutation({
    onSuccess: async () => {
      await trpcContext.databases.listUserDatabases.invalidate();
    },
  });

  const setActiveDb = trpc.databases.setActiveDb.useMutation();
  const setLocalConnection = trpc.local.setConnection.useMutation({
    trpc: {
      context: { source: "local" },
    },
  });

  const handleSave = async () => {
    if (
      !formData.dbHost ||
      !formData.dbPort ||
      !formData.localDbUser ||
      !formData.localDbPassword ||
      !formData.dbName ||
      !formData.restrictedDbUser ||
      !formData.restrictedDbPassword
    ) {
      setErrorMessage("All fields are required.");
      return;
    }
    try {
      setOpen(false);
      const result = await upsertDbConnection.mutateAsync({
        ...formData,
        databaseId: database?.databaseId ?? undefined,
      }); //TODO get userId
      if (activeDbId !== result.databaseId) {
        await setActiveDb.mutateAsync({ databaseId: result.databaseId });
        await trpcContext.databases.getActiveDb.invalidate();
        toast({
          title: `${formData.dbName} set as your active database.`,
          className: "bg-green-100 text-green-700",
        });
      }
      await setLocalConnection.mutateAsync({
        dbHost: formData.dbHost,
        dbPort: formData.dbPort,
        dbName: formData.dbName,
        user: formData.localDbUser,
        password: formData.localDbPassword,
      });
    } catch (error) {
      setErrorMessage("Failed to save connection. Please try again.");
    }
  };

  const handleTest = async () => {
    const connectionValues = {
      dbHost: formData.dbHost,
      dbPort: formData.dbPort,
      dbName: formData.dbName,
      user: formData.localDbUser,
      password: formData.localDbPassword,
    };
    await trpcContext.client.local.setConnection.mutate(connectionValues, {
      context: { source: "local" },
    });
    const test = await trpcContext.client.local.testConnection.query(
      undefined,
      { context: { source: "local" } },
    );
    if (!test.success) {
      setErrorMessage(
        `'Your local connection' couldn't be established. \n \n ${test.message}`,
      );
      return;
    }
    const restrictedConnectionValues = {
      dbHost: formData.dbHost,
      dbPort: formData.dbPort,
      dbName: formData.dbName,
      user: formData.restrictedDbUser,
      password: formData.restrictedDbPassword,
    };
    const restrictedTest =
      await trpcContext.client.databases.testRestrictedConnection.query(restrictedConnectionValues);
    if (!restrictedTest.success) {
      setErrorMessage(
        `'Restricted connection' couldn't be established. \n \n ${restrictedTest.message}`,
      );
      return;
    }
    toast({
      title: "Success",
      description: "Connections established successfully.",
      className: "bg-green-100 text-green-700",
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children ?? (
            <Button
              variant="outline"
              className="flex items-center gap-2 py-2 pl-3 pr-4"
            >
              <Plus />
              New Connection
            </Button>
          )}
        </DialogTrigger>
        <DialogTitle></DialogTitle> {/*w/o DialogTitle error occurs*/}
        <DialogContent className="sm:max-w-[850px]">
          <div className="grid grid-cols-2 gap-4">
            {/* Your Connection Section */}
            <div className="rounded border p-4">
              <h3 className="mb-2 text-lg font-semibold">Your Connection</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Used for queries made locally.{" "}
                {/* I think for me ipv6 connections were not working in the past(?)*/}
              </p>
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="db-host" className="text-right">
                    Host
                  </Label>
                  <Input
                    id="db-host"
                    defaultValue={database ? database.dbHost : ""}
                    onChange={(e) => handleChange("dbHost", e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="db-port" className="text-right">
                    Port
                  </Label>
                  <Input
                    id="db-port"
                    defaultValue={database ? database.dbPort : ""}
                    onChange={(e) => handleChange("dbPort", e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="local-user" className="text-right">
                    User
                  </Label>
                  <Input
                    id="local-user"
                    defaultValue={database ? database.localDbUser : ""}
                    onChange={(e) =>
                      handleChange("localDbUser", e.target.value)
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="local-password" className="text-right">
                    Password
                  </Label>
                  <Input
                    id="local-password"
                    defaultValue={database ? database.localDbPassword : ""}
                    onChange={(e) =>
                      handleChange("localDbPassword", e.target.value)
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="db-name" className="text-right">
                    Database
                  </Label>
                  <Input
                    id="db-name"
                    defaultValue={database ? database.dbName : ""}
                    onChange={(e) => handleChange("dbName", e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
            </div>

            {/* Restricted Connection Section */}
            <div className="rounded border p-4">
              <h3 className="mb-2 text-lg font-semibold">
                Restricted Connection
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Used by [pgtool] just for projection creation. Only a read-only user is
                necesary. (Must be ipv4 compatible.)
              </p>
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="restricted-user" className="text-right">
                    User
                  </Label>
                  <Input
                    id="restricted-user"
                    defaultValue={database ? database.restrictedDbUser : ""}
                    onChange={(e) =>
                      handleChange("restrictedDbUser", e.target.value)
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="restricted-password" className="text-right">
                    Password
                  </Label>
                  <Input
                    id="restricted-password"
                    defaultValue={database ? database.restrictedDbPassword : ""}
                    onChange={(e) =>
                      handleChange("restrictedDbPassword", e.target.value)
                    }
                    className="col-span-3"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="outline" onClick={handleTest}>
              Test
            </Button>
            <Button onClick={handleSave}>Save</Button>
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
