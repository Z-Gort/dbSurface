interface reduceColumnProps {
  schema: string;
  table: string;
  vectorColumn: string;
  primaryKeyColumn: string;
  projectionId: string;
  numberPoints: number;
  databaseId: string;
}

export function reduceColumn({
  schema,
  table,
  vectorColumn,
  primaryKeyColumn,
  projectionId,
  numberPoints,
  databaseId,
}: reduceColumnProps) {
  const endpointUrl = new URL(process.env.MODAL_ENDPOINT_URL!);

  endpointUrl.searchParams.append("schema", schema);
  endpointUrl.searchParams.append("table", table);
  endpointUrl.searchParams.append("vector_col", vectorColumn);
  endpointUrl.searchParams.append("primary_key_col", primaryKeyColumn);
  endpointUrl.searchParams.append("projection_id", projectionId);
  endpointUrl.searchParams.append("database_id", databaseId);
  endpointUrl.searchParams.append("total_rows", numberPoints.toString());

  try {
    void fetch(endpointUrl.toString());
  } catch (err) {
    console.error("Error triggering Modal function:", err);
  }
}