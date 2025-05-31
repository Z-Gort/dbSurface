
function arraysAreEqual(arr1: any[], arr2: any[]): boolean {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((value, index) => value === arr2[index]);
}

async function applyDisabledIndexQuery(
  query: string,
  executeQuery: (input: { query: string }) => Promise<{ rows: any[] }>,
): Promise<any[]> {
  await executeQuery({
    query:
      "BEGIN; SET LOCAL enable_indexscan = OFF; SET LOCAL enable_bitmapscan = OFF;",
  });
  const { rows: disabledResult } = await executeQuery({ query: query });
  await executeQuery({ query: "COMMIT;" });
  return disabledResult;
}

export async function getPrecision(
  query: string,
  originalQueryResults: string,
  executeQuery: (input: { query: string }) => Promise<{ rows: any[] }>,
): Promise<string> {
  const vectorSimilarityRegex =
    /(?:\b(\w+)\.)?(\w+)\s*(<->|<#>|<=>|<\+>|<~>|<%>)/;
  const match = query.match(vectorSimilarityRegex);

  if (!match) {
    throw new Error("No vector similarity operation found in the query.");
  }
  const columnOfInterest = match[2];
  if (!columnOfInterest) {
    throw new Error("Failed to extract column name from the query.");
  }
  const disabledResult = await applyDisabledIndexQuery(query, executeQuery);

  const parsed = JSON.parse(originalQueryResults);
  if (!originalQueryResults) {
    throw new Error("No original results.");
  }
  const extractedColumns = Object.keys(parsed[0]);
  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Parsed data is invalid or empty.");
  }
  if (!extractedColumns.includes(columnOfInterest)) {
    throw new Error(
      `Column "${columnOfInterest}" not found in the parsed data.`,
    );
  }

  const originalColumnResults = parsed.map((row) =>
    JSON.parse(row[columnOfInterest]),
  );
  const disabledColumnResults = disabledResult.map((row) =>
    JSON.parse(row[columnOfInterest]),
  );

  const usedOriginalIndices = new Set<number>();
  let matchingCount = 0;

  for (const disabledValue of disabledColumnResults) {
    const matchIndex = originalColumnResults.findIndex((originalValue, idx) => {
      return (
        !usedOriginalIndices.has(idx) &&
        arraysAreEqual(disabledValue, originalValue)
      );
    });
    if (matchIndex !== -1) {
      matchingCount++;
      usedOriginalIndices.add(matchIndex);
    }
  }

  const precision = ((matchingCount / originalColumnResults.length) * 100).toFixed(2);

  return precision;
}
