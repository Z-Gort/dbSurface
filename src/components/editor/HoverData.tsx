import React from "react";
import { Card, CardContent } from "~/components/ui/card";
import { useTabContext } from "../providers/TabContext";

function humanizeKey(raw: string) {
  const noPrefix = raw.replace(/^user_/, "");
  return noPrefix
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1))
    .join(" ");
}

export function HoverData() {
  const { tab } = useTabContext();
  const { currentHover, timestampCols } = tab;

  if (currentHover.index === -1) {
    return null;
  }

  const data = currentHover.data as Record<string, any>;

  return (
    <Card className="mr-4 mt-2 max-h-full w-fit max-w-full overflow-y-auto">
      <CardContent className="space-y-2 p-2">
        <ul className="m-0 list-none space-y-1 p-0">
          {Object.entries(data).map(([rawKey, rawValue]) => {
            if (rawKey === "x" || rawKey === "y" || rawKey === "pkHash") {
              return null;
            }
            let displayValue = rawValue;
            if (timestampCols.current.has(rawKey.replace(/^user_/, ""))) {
              const ms = Number(rawValue);
              if (!Number.isNaN(ms)) {
                displayValue = new Date(ms).toISOString();
              }
            }

            return (
              <li
                key={rawKey}
                className="flex cursor-default items-start space-x-1 rounded px-1 py-0.5 transition-colors hover:bg-gray-100"
              >
                <span className="font-mono text-xs font-semibold">
                  {humanizeKey(rawKey)}:
                </span>
                <span
                  className="break-words font-mono text-xs"
                  style={{ wordBreak: "break-all" }}
                >
                  {String(displayValue)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
