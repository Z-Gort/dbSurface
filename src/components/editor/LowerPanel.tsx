import { type Monaco } from "@monaco-editor/react";
import { ChevronsUpDown } from "lucide-react";
import React, { type MutableRefObject } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { getPrecision } from "~/lib/precisionUtils";
import { useTabContext } from "../TabContext";
import { Button } from "../ui/button";
import { ColorBy } from "./ColorBy";
import { HoverData } from "./HoverData";
import { ProjectionsDropdown } from "./ProjectionsDropdown";
import { ResultsSection } from "./ResultsSection";
import { trpc } from "~/lib/client";
import { getQueryClient } from "@trpc/react-query/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export function LowerPanel({
  monacoRef,
}: {
  monacoRef: MutableRefObject<Monaco | null>;
}) {
  const { tab, setTab } = useTabContext();
  const executeQuery = trpc.local.executeQuery.useMutation({
    trpc: {
      context: { source: "local" },
    },
  });
  const measureQueryLatency = trpc.local.measureQueryLatency.useMutation({
    trpc: {
      context: { source: "local" },
    },
  });
  const getQueryHashes = trpc.local.getQueryHashes.useMutation({
    trpc: {
      context: { source: "local" },
    },
  });

  const {
    result,
    latency,
    ranSimilarity,
    query,
    precision,
    count,
    limited,
    isLoading,
    projecting,
  } = tab;
  const [isOpen, setIsOpen] = React.useState(true);

  const updateResult = (updates: {
    result?: string;
    latency?: string;
    ranSimilarity?: boolean;
    precision?: number | string;
    count?: number;
    limited?: boolean;
    isLoading?: boolean;
    hashes?: Set<number>;
  }) => {
    setTab((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleRunQuery = async () => {
    const currentQuery = monacoRef.current!.editor.getModels()[0]!.getValue();
    query.current = currentQuery;
    updateResult({ isLoading: true });

    if (projecting) {
      if (!query.current.trim()) {
        updateResult({ isLoading: false, hashes: undefined });
        return;
      }
      try {
        const hashes = await getQueryHashes.mutateAsync({
          query: query.current,
        });
        console.log("recieved hashes", hashes);
        const hashSet = new Set<number>(hashes);

        const vectorKeywords = ["<->", "<#>", "<=>", "<+>", "<~>", "<%>"];
        const ranSimilarity = vectorKeywords.some((keyword) =>
          query.current.includes(keyword),
        );

        updateResult({ hashes: hashSet, isLoading: false, ranSimilarity: ranSimilarity });
        return;
      } catch (error) {
        updateResult({
          hashes: undefined,
          isLoading: false,
          ranSimilarity: false,
        });
        return;
      }
    }

    if (!query.current.trim()) {
      updateResult({ result: "No Query...", isLoading: false });
      return;
    }

    try {
      const {
        rows: data,
        count,
        limited,
      } = await executeQuery.mutateAsync({
        query: query.current,
        disableLimit: projecting,
      });

      const { serverLatency: latency } = await measureQueryLatency.mutateAsync({
        query: query.current,
      });

      const vectorKeywords = ["<->", "<#>", "<=>", "<+>", "<~>", "<%>"];
      const ranSimilarity = vectorKeywords.some((keyword) =>
        query.current.includes(keyword),
      );
      updateResult({
        result: JSON.stringify(data, null, 2),
        latency: latency,
        ranSimilarity: ranSimilarity,
        precision: undefined,
        count: count,
        limited: limited,
        isLoading: false,
      });
    } catch (error) {
      updateResult({
        result: (error as Error).message,
        latency: undefined,
        count: undefined,
        precision: undefined,
        ranSimilarity: undefined,
        limited: limited,
        isLoading: false,
      });
    }
  };

  const handleCheckPrecision = async () => {
    const { mutateAsync } = executeQuery;
    let precision;
    updateResult({ isLoading: true });
    try {
      const { rows: approximateRows } = await executeQuery.mutateAsync({
        query: query.current,
        disableLimit: true,
      });

      const approximateResult = JSON.stringify(approximateRows, null, 2);

      precision = await getPrecision(
        query.current,
        approximateResult,
        mutateAsync,
      );
    } catch (error) {
      console.log("precision error", error);
      precision = "-";
    } finally {
      updateResult({ isLoading: false });
    }
    updateResult({ precision: precision });
  };

  return (
    <div className="mt-1 flex h-full flex-col">
      {/* Button Section */}
      <div className="flex h-10 items-center justify-between px-2 pb-2 pt-2">
        <p
          className={`truncate text-sm font-semibold leading-7 [&:not(:first-child)]:mt-6 ${projecting ? "invisible" : ""} `}
        >
          {latency}{" "}
          {latency && (
            <span className="text-xs font-normal text-gray-500">
              (server execution)
            </span>
          )}
          {count && (
            <span className="ml-1 text-sm font-semibold">
              {count} rows{" "}
              {limited && (
                <span className="text-xs font-normal text-gray-500">
                  (limited to 1000)
                </span>
              )}
            </span>
          )}
        </p>
        <div className="flex items-center space-x-2">
          {/* Precision Section */}
          <div className="text-sm font-bold leading-7 [&:not(:first-child)]:mt-6">
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-2 border-gray-300 border-t-black"></div>
            ) : precision !== undefined ? (
              <p>{precision}%</p>
            ) : null}
          </div>
          <div className="flex items-center space-x-3">
            {/* {ranSimilarity && ( */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleCheckPrecision}
                    disabled={!ranSimilarity}
                  >
                    Check Precision
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded bg-black p-2 text-white shadow">
                  <p className="max-w-xs text-xs">
                    Note: To check precision, your query must return the same
                    vector column you’re comparing in the similarity filter.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* )} */}
            <ProjectionsDropdown />
            <Button onClick={handleRunQuery} className="px-4 py-2">
              Run
            </Button>
          </div>
        </div>
      </div>
      {/* Results Section */}

      {projecting ? (
        <div className="mt-1 flex h-full min-h-0 flex-col items-start overflow-hidden">
          <div className="h-[1.5px] w-full bg-primary" />
          <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="space-y-1"
          >
            {/* Trigger bar */}
            <div className="flex items-center">
              <h4 className="text-sm font-semibold">Color By</h4>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronsUpDown />
                  <span className="sr-only">Toggle Color By</span>
                </Button>
              </CollapsibleTrigger>
            </div>

            {/* Everything below only shows when open */}

            <CollapsibleContent style={{ width: "auto" }}>
              <div className="min-h-0 min-w-0 flex-initial pb-5">
                <ColorBy />
              </div>
            </CollapsibleContent>
          </Collapsible>
          <div className="mt-2 h-[0.5px] w-full bg-primary" />
          <div className="min-h-0 flex-initial pb-5">
            <HoverData />
          </div>
        </div>
      ) : (
        <div className="mt-1 flex-1 overflow-y-hidden overflow-x-visible">
          <ResultsSection />
        </div>
      )}
    </div>
  );
}
