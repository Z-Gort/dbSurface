interface reduceTableProps {
  schema: string;
  table: string;
  vectorColumn: string;
  primaryKeyColumn: string;
  projectionId: string;
  numberPoints: number;
  databaseId: string;
  remainingRows: number;
}

export function reduceTable({
  schema,
  table,
  vectorColumn,
  primaryKeyColumn,
  projectionId,
  numberPoints,
  databaseId,
  remainingRows,
}: reduceTableProps) {
  const endpointUrl = new URL(process.env.MODAL_ENDPOINT_URL!);

  endpointUrl.searchParams.append("schema", schema);
  endpointUrl.searchParams.append("table", table);
  endpointUrl.searchParams.append("vector_col", vectorColumn);
  endpointUrl.searchParams.append("primary_key_col", primaryKeyColumn);
  endpointUrl.searchParams.append("projection_id", projectionId);
  endpointUrl.searchParams.append("database_id", databaseId);
  endpointUrl.searchParams.append("total_rows", numberPoints.toString());
  endpointUrl.searchParams.append("remaining_rows", remainingRows.toString());

  try {
    void fetch(endpointUrl.toString(), {
      headers: {
        "Modal-Key": process.env.MODAL_KEY!,
        "Modal-Secret": process.env.MODAL_SECRET!,
      },
    });
  } catch (err) {
    console.error("Error triggering Modal function:", err);
  }
}
