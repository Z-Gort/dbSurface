import { useClerk } from "@clerk/nextjs";
import type { Monaco } from "@monaco-editor/react";
import { useRef } from "react";
import Map from "~/components/map/Map";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { useTabContext } from "../TabContext";
import { EditorToolbar } from "./EditorToolbar";
import { LowerPanel } from "./LowerPanel";
import { SqlEditor } from "./SQLEditor";
import { useAddDefinitions } from "./useAddDefinitions";
import { Skeleton } from "../ui/skeleton";

export function ThreePanels() {
  const { tab } = useTabContext();
  const { panelCoords, projecting } = tab;
  const monacoRef = useRef<Monaco | null>(null);
  useAddDefinitions(monacoRef.current);

  return (
    <>
      {projecting ? (
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[100vh] w-full"
        >
          <ResizablePanel
            id={`editor-results-0`}
            order={1}
            defaultSize={panelCoords.current.horizontal}
            minSize={10}
            onResize={(size) => {
              panelCoords.current.horizontal = size;
            }}
          >
            <ResizablePanelGroup
              direction="vertical"
              className="min-h-[100vh] w-full"
            >
              <ResizablePanel
                defaultSize={panelCoords.current.vertical}
                minSize={5}
                onResize={(size) => {
                  panelCoords.current.vertical = size;
                }}
              >
                (
                <>
                  <EditorToolbar />
                  <SqlEditor monacoRef={monacoRef} />
                </>
                )
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel minSize={5}>
                <LowerPanel monacoRef={monacoRef} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            id={`Map-0`}
            order={2}
            minSize={10}
            style={{ position: "relative" }}
          >
            <Map />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <ResizablePanelGroup
          direction="vertical"
          className="min-h-[100vh] w-full"
        >
          <ResizablePanel
            defaultSize={panelCoords.current.vertical}
            minSize={5}
            onResize={(size) => {
              panelCoords.current.vertical = size;
            }}
          >
            (
            <>
              <EditorToolbar />
              <SqlEditor monacoRef={monacoRef} />
            </>
            )
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel minSize={5}>
            <LowerPanel monacoRef={monacoRef} />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </>
  );
}
