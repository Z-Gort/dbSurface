import { ChevronDown } from "lucide-react";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { trpc } from "~/lib/client";
import { useTabContext } from "../TabContext";
import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { DECILE_COLORS } from "../map/Colors";
import { ContinuousLegend } from "./ContinuousLegend";

export function ColorBy() {
  const { tab, setTab } = useTabContext();
  const {
    projectionId,
    colorBy,
    categoryMap,
    deckglLoaded,
    continuousCols,
    timestampCols,
    continuousBuckets,
  } = tab;

  const projection = trpc.projections.getProjection.useQuery({
    projectionId: projectionId,
  });

  const fallbackColor: [number, number, number, number] = [166, 206, 227, 200];

  const columns = projection.data?.projection?.columns ?? [];

  useEffect(() => {}, [deckglLoaded]); //Update with descrete columns or continuous buckets

  const defaultToggle = colorBy?.discrete === false ? "continuous" : "discrete";

  return (
    <>
      <div>
        <Tabs defaultValue={defaultToggle} className="w-full min-w-0">
          <TabsList className="inline-grid grid-cols-2 gap-x-1">
            <TabsTrigger value="discrete" className="h-7 px-1 py-0.5 text-xs">
              Discrete
            </TabsTrigger>
            <TabsTrigger value="continuous" className="h-7 px-1 py-0.5 text-xs">
              Continuous
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discrete">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Color By <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-64 w-60 overflow-y-auto">
                <DropdownMenuLabel>Discrete</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!deckglLoaded ? (
                  <>
                    <DropdownMenuItem disabled>
                      <Skeleton className="h-4 w-32 rounded-md" />
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Skeleton className="h-4 w-24 rounded-md" />
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Skeleton className="h-4 w-28 rounded-md" />
                    </DropdownMenuItem>
                  </>
                ) : (
                  columns.map((col) => (
                    <DropdownMenuItem
                      onClick={async () => {
                        setTab((prev) => ({
                          ...prev,
                          colorBy: { column: col, discrete: true },
                          deckglLoaded: false,
                        }));
                      }}
                      key={col}
                    >
                      {col === colorBy?.column && colorBy?.discrete ? (
                        <strong>{col}</strong>
                      ) : (
                        col
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsContent>
          <TabsContent value="continuous">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Color By <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-64 w-60 overflow-y-auto">
                <DropdownMenuLabel>Continuous</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!deckglLoaded || !continuousCols ? (
                  <>
                    <DropdownMenuItem disabled>
                      <Skeleton className="h-4 w-32 rounded-md" />
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Skeleton className="h-4 w-24 rounded-md" />
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Skeleton className="h-4 w-28 rounded-md" />
                    </DropdownMenuItem>
                  </>
                ) : (
                  continuousCols.map((col) => (
                    <DropdownMenuItem
                      onClick={async () => {
                        setTab((prev) => ({
                          ...prev,
                          colorBy: { column: col, discrete: false },
                          deckglLoaded: false,
                        }));
                      }}
                      key={col}
                    >
                      {col === colorBy?.column && !colorBy?.discrete ? (
                        <strong>{col}</strong>
                      ) : (
                        col
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsContent>
        </Tabs>

        {/* If on the first viewport load there are less than 200 found categories, then on zooming in there are more that are found the 
        legend won't show more--updating state on every viewport load is too costly--but using more than 10-20 categories is not really feasibly anyway*/}
        {deckglLoaded &&
          colorBy?.discrete &&
          categoryMap.current &&
          Object.keys(categoryMap.current).length > 0 && (
            <Card className="mr-4 mt-2 max-h-[200px] min-w-0 max-w-full self-start overflow-x-auto overflow-y-auto">
              <CardContent className="space-y-2 p-2">
                <ul className="mr-2 list-none p-0">
                  {categoryMap.current &&
                    Object.keys(categoryMap.current).length >= 200 && (
                      <li
                        key="other"
                        className="flex min-w-0 cursor-default items-center space-x-2 rounded transition-colors hover:bg-gray-100"
                      >
                        <div
                          className="h-3 w-3 flex-shrink-0 rounded-sm"
                          style={{
                            backgroundColor: `rgba(${fallbackColor[0]},${fallbackColor[1]},${fallbackColor[2]},${fallbackColor[3] / 255})`,
                          }}
                        />
                        <span className="break-all font-mono text-sm leading-tight">
                          Other
                        </span>
                      </li>
                    )}
                  {Object.entries(categoryMap.current).map(
                    ([rawLabel, rgba], index) => {
                      let display = rawLabel;
                      if (timestampCols.current.has(colorBy.column)) {
                        const ms = Number(rawLabel);
                        const d = new Date(ms);
                        display = d.toISOString();
                      }

                      const [r, g, b, a] = rgba;
                      const cssColor = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                      return (
                        <li
                          key={index}
                          className="flex min-w-0 cursor-default items-center space-x-2 rounded transition-colors hover:bg-gray-100"
                        >
                          <div
                            className="h-3 w-3 flex-shrink-0 rounded-sm"
                            style={{ backgroundColor: cssColor }}
                          />
                          <span
                            className="break-words font-mono text-sm leading-tight"
                            style={{ wordBreak: "break-all" }}
                          >
                            {display}
                          </span>
                        </li>
                      );
                    },
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

        {deckglLoaded &&
          colorBy &&
          !colorBy.discrete &&
          continuousBuckets.current.length > 0 && (
            <div className="ml-4 mr-10 mt-4">
              <ContinuousLegend
                buckets={continuousBuckets.current}
                colors={DECILE_COLORS}
                height={280}
                barThickness={35}
                isTimestamp={timestampCols.current.has(colorBy.column)}
              />
            </div>
          )}
      </div>
    </>
  );
}
