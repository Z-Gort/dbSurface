import { useEffect, useState } from "react";
import { type Row } from "@tanstack/react-table";
import { trpc } from "~/lib/client";
import type { Projection } from "./Columns";
import { useToast } from "~/components/hooks/use-toast";

export default function EditableProjectionCell({
  row,
}: {
  row: Row<Projection>;
}) {
  const { id, projection: originalName } = row.original;
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(originalName);
  const { toast } = useToast();

  const utils = trpc.useUtils();
  const updateMutation = trpc.projections.updateProjection.useMutation();

  useEffect(() => {
    setValue(originalName);
  }, [originalName]);

  const commit = async () => {
    if (value === originalName || value === "") {
      setIsEditing(false);
      return;
    }
    try {
      await updateMutation.mutateAsync({
        projectionId: id,
        newName: value,
      });
      await utils.projections.listActiveDbProjections.invalidate();
      setIsEditing(false);
    } catch (_) {
      setValue(originalName);
      toast({
        title: `Projection title already in use.`,
        className: "bg-red-100 text-red-700",
      });
      setIsEditing(false);
    }
  };

  return isEditing ? (
    <input
      className="m-0 block h-full w-full max-w-xs border-b border-gray-300 bg-transparent p-0 focus:outline-none"
      value={value}
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setValue(originalName);
          setIsEditing(false);
        }
      }}
    />
  ) : (
    <span
      className="block h-full w-full max-w-xs cursor-pointer truncate hover:bg-gray-50"
      onClick={() => setIsEditing(true)}
    >
      {originalName}
    </span>
  );
}
