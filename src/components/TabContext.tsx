import React, {
  createContext,
  useContext,
  useState,
  type MutableRefObject,
  type ReactNode
} from "react";

export type TabState = { //some of these fields are not strictly necessary without multiple tabs--will gradually condense
  title: string;
  query: MutableRefObject<string>;
  result: string;
  panelCoords: MutableRefObject<{ horizontal: number; vertical: number }>;
  projecting: boolean;
  categoryMap: MutableRefObject<
    Record<string, [number, number, number, number]>
  >;
  projectionPrimaryKey?: string;
  deckglLoaded: boolean; //this is just used as a boolean now
  timestampCols: MutableRefObject<Set<string>>;
  continuousBuckets: MutableRefObject<number[]>;
  currentHover: {
    index: number;
    layerId: string;
    data: any;
  };
  continuousCols?: string[];
  colorBy?: { column: string; discrete: boolean };
  latency?: string;
  ranSimilarity?: boolean;
  precision?: number | string;
  count?: number;
  limited?: boolean;
  isLoading?: boolean;
  projectionId?: string;
  hashes?: Set<number>;
};

type TabContextType = {
  tab: TabState;
  setTab: React.Dispatch<React.SetStateAction<TabState>>;
};

const TabContext = createContext<TabContextType | undefined>(undefined);

const initialTab: TabState = {
  title: "Query 1",
  query: { current: "" } as MutableRefObject<string>,
  result: "",
  projecting: false,
  panelCoords: {
    current: { horizontal: 30, vertical: 50 },
  } as MutableRefObject<{
    horizontal: number;
    vertical: number;
  }>,
  categoryMap: { current: {} } as MutableRefObject<
    Record<string, [number, number, number, number]>
  >,
  deckglLoaded: false,
  timestampCols: { current: new Set<string>() } as MutableRefObject<
    Set<string>
  >,
  continuousBuckets: { current: [] } as MutableRefObject<number[]>,
  currentHover: { index: -1, layerId: "", data: null },
};

export const TabProvider = ({ children }: { children: ReactNode }) => {
  const [tab, setTab] = useState<TabState>(initialTab);

  return (
    <TabContext.Provider value={{ tab, setTab }}>
      {children}
    </TabContext.Provider>
  );
};

export const useTabContext = () => {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("useTabContext must be used within TabProvider");
  return ctx;
};