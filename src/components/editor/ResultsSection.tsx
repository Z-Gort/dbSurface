import React, { useCallback, useMemo, useState } from "react";
import { DataGrid } from "react-data-grid";
import { useTabContext } from "../TabContext";
import "react-data-grid/lib/styles.css";
import "~/styles/globals.css";
import AutoSizer from "react-virtualized-auto-sizer";

const EST_CHAR_WIDTH = 8.25;
const MIN_COLUMN_WIDTH = 100;
const MAX_COLUMN_WIDTH = 550;
const DEFAULT_ROW_HEIGHT = 35;

const columnRender = (name: string) => (
  <div className="flex h-full items-center justify-center font-mono text-xs">
    {name}
  </div>
);

const cellFormatter = ({
  row,
  column,
  rowIdx,
  isRowExpanded,
  onRequestExpand,
  onClearExpanded,
}) => {
  const cellValue = row[column.key];

  return (
    <div
      onDoubleClick={onRequestExpand}
      onClick={() => {
        if (!isRowExpanded) {
          onClearExpanded();
        }
      }}
      className={`relative h-full w-full ${
        isRowExpanded ? "cursor-text" : "cursor-default"
      }`}
    >
      {isRowExpanded ? (
        // Expanded state: scrollable, with border and padding.
        <div
          className="absolute inset-0 overflow-auto p-1 font-mono text-xs"
          style={{
            whiteSpace: "normal",
            overflowWrap: "break-word",
          }}
        >
          {cellValue === null
            ? "NULL"
            : typeof cellValue === "string"
              ? cellValue
              : JSON.stringify(cellValue, null, 2)}
        </div>
      ) : (
        // Normal state: as before.
        <div
          className="absolute inset-0 flex items-center font-mono text-xs"
          style={{
            whiteSpace: "pre",
            overflowWrap: "break-word",
          }}
        >
          {cellValue === null
            ? "NULL"
            : typeof cellValue === "string"
              ? cellValue
              : JSON.stringify(cellValue, null, 2)}
        </div>
      )}
    </div>
  );
};

export function ResultsSection() {
  const { tab } = useTabContext();
  const { result } = tab;
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleRequestExpand = useCallback(
    (rowIdx: number) => {
      if (expandedRow !== rowIdx) {
        setExpandedRow(rowIdx);
      }
    },
    [expandedRow],
  );

  const handleClearExpanded = useCallback(() => {
    setExpandedRow(null);
  }, []);

  // Parse result rows from SQL result
  const { rows, isError } = useMemo(() => {
    if (!result) return { rows: [], isError: false };
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return { rows: parsed, isError: false };
      } else {
        return { rows: [], isError: true };
      }
    } catch (error) {
      return { rows: [], isError: true };
    }
  }, [result]);

  const columns = useMemo(() => {
    if (rows.length === 0) return [];
    const keys = Object.keys(rows[0]);
    return keys.map((key) => {
      const maxColumnValueLength = rows
        .map((row) => String(row[key]).length)
        .reduce((a, b) => Math.max(a, b), 0);
      const columnWidth = Math.max(
        Math.min(maxColumnValueLength * EST_CHAR_WIDTH, MAX_COLUMN_WIDTH),
        MIN_COLUMN_WIDTH,
      );
      return {
        key,
        name: key,
        resizable: true,
        width: columnWidth,
        minWidth: MIN_COLUMN_WIDTH,
        renderCell: (props) =>
          cellFormatter({
            ...props,
            rowIdx: props.rowIdx,
            isRowExpanded: expandedRow === props.rowIdx,
            onRequestExpand: () => handleRequestExpand(props.rowIdx),
            onClearExpanded: handleClearExpanded,
          }),
        renderHeaderCell: () => columnRender(key),
      };
    });
  }, [rows, expandedRow]);

  const rowHeight = useCallback(
    (row) => {
      // Find the row's index.
      const rowIdx = rows.indexOf(row);
      // If the row is expanded, return the expanded height.
      return expandedRow === rowIdx
        ? DEFAULT_ROW_HEIGHT * 4
        : DEFAULT_ROW_HEIGHT;
    },
    [expandedRow, rows],
  );

  if (rows.length === 0 || isError) {
    const displayMessage = result
      ? isError
        ? result
        : "OK. No rows returned."
      : "";
    return (
      <div className="bg-table-header-light dark:bg-table-header-dark p-4">
        <p className="text-foreground-light m-0 border-0 px-4 py-3 font-mono text-sm">
          {displayMessage}
        </p>
      </div>
    );
  }

  return (
    <AutoSizer>
      {({ height, width }) => {
        return (
          <DataGrid
            columns={columns}
            rows={rows}
            style={{ height, width }}
            className="rdg-light"
            rowHeight={rowHeight}
          />
        );
      }}
    </AutoSizer>
  );
}

export default ResultsSection;
