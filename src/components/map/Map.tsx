import { OrthographicView } from "@deck.gl/core";
import { TileLayer } from "@deck.gl/geo-layers";
import DeckGL from "@deck.gl/react";
import { scaleQuantile } from "d3-scale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "~/lib/client";
import { createCustomTilesetClass } from "~/lib/createCustomTilesetClass";
import { CustomScatterplotLayer } from "~/lib/customScatterplotLayer";
import {
  NonEmptyIterableData,
  type IterableData,
  type Metadata,
  type TileSource,
} from "~/miscellaneousTypes/types";
import { useTabContext } from "../TabContext";
import { DECILE_COLORS, palette, queryColors } from "./Colors";
import {
  flattenTiles,
  getFillColor,
  getQueriedMSizeultiplier,
  getViewSettings,
  loadAllSignedUrls,
  loadTileData,
  maxZoomFromTiles,
  queryGetFillColor,
  useQueryData,
} from "./mapUtils";
import { PolygonLayer } from "@deck.gl/layers";

export default function Map() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [tileUrlMap, setTileUrlMap] = useState<TileSource>({});
  const { tab, setTab } = useTabContext();
  const {
    projectionId,
    colorBy,
    categoryMap,
    deckglLoaded,
    timestampCols,
    continuousBuckets,
    currentHover,
    hashes,
  } = tab;
  const categoryCountRef = useRef(0);
  const trpcContext = trpc.useUtils();

  const { data: queryData } = useQueryData(hashes, tileUrlMap, metadata);

  const handleAfterRender = useCallback(() => {
    //notify colorby panel categorymap has been fully created by fillColorAccessor
    if (deckglLoaded) return;
    setTab((prev) => ({ ...prev, deckglLoaded: true }));
  }, [deckglLoaded, setTab]);

  useEffect(() => {
    setMetadata(null);
    setTileUrlMap({});
    setTab((prev) => ({
      ...prev,
      currentHover: { index: -1, layerId: "", data: null },
    }));
  }, [projectionId, setTab]); //reset hover on projectionId change

  useEffect(() => {
    categoryMap.current = {};
    categoryCountRef.current = 0;
  }, [colorBy, projectionId, categoryMap]); //reset categoryMap on colorBy or projectionId change

  useEffect(() => {
    // poll for new signedUrls every 85 minutes
    const intervalId = setInterval(
      () => {
        void loadAllSignedUrls(
          projectionId,
          setTileUrlMap,
          setMetadata,
          setTab,
          trpcContext,
        );
      },
      60 * 85 * 1000,
    );

    void loadAllSignedUrls(
      projectionId,
      setTileUrlMap,
      setMetadata,
      setTab,
      trpcContext,
    );

    return () => clearInterval(intervalId);
  }, [projectionId]);

  const colorScale = useMemo<
    (v: number) => [number, number, number, number]
  >(() => {
    const buckets = metadata?.colorStats?.[`user_${colorBy?.column}`]?.buckets;
    continuousBuckets.current = buckets ?? [];
    if (buckets && buckets.length > 0) {
      return scaleQuantile<[number, number, number, number]>()
        .domain(buckets)
        .range(DECILE_COLORS);
    }
    return () => queryColors.primary;
  }, [metadata, colorBy]);

  const fillColorAccessor = useMemo(
    () =>
      (
        _: any,
        { index, data }: { index: number; data: NonEmptyIterableData },
      ) =>
        getFillColor(
          {
            hashes,
            colorBy,
            colorScale,
            metadata,
            categoryMap,
            categoryCountRef,
            palette,
            queryColors,
            queryData,
          },
          _,
          index,
          data,
        ),
    [hashes, colorBy, colorScale, metadata, categoryMap, queryData],
  );

  const queryFillColorAccessor = useMemo(
    () =>
      (
        _: any,
        { index, data }: { index: number; data: NonEmptyIterableData },
      ) =>
        queryGetFillColor(
          {
            colorBy,
            colorScale,
            metadata,
            categoryMap,
            categoryCountRef,
            palette,
            queryColors,
          },
          _,
          index,
          data,
        ),
    [hashes, colorBy, colorScale, metadata, categoryMap],
  );

  const tileLayer =
    metadata &&
    new TileLayer<IterableData>({
      id: "tile-layer",
      pickable: false,
      autoHighlight: true,
      minZoom: 0,
      maxZoom: maxZoomFromTiles(flattenTiles(metadata.tiles)),
      zoomOffset: -4,
      tileSize: metadata.extent.size,
      extent: [0, 0, metadata.extent.size, metadata.extent.size],
      TilesetClass: createCustomTilesetClass(flattenTiles(metadata.tiles)),
      getTileSize: () => metadata.extent.size,
      updateTriggers: {
        getFillColor: [hashes, colorBy, queryData],
        getRadius: [hashes],
      },
      getRadius: (_: any, { index, data }) => {
        const hash = data.src.pkHash[index];
        const queriedMultiplier = getQueriedMSizeultiplier(
          hashes,
          Number(metadata.tiles["0/0_0"].node_count),
        );
        return hashes?.has(hash)
          ? queriedMultiplier // e.g. 50% bigger
          : 0.5;
      },
      transitions: {
        getFillColor: 200,
      },
      onHover: (info) => {
        if (info.object) {
          setTab((prev) => ({
            ...prev,
            currentHover: {
              index: info.index,
              layerId: info.sourceLayer!.id,
              data: info.object,
            },
          }));
        }
      },
      getTileData: async ({ index }) => {
        const iterableData = await loadTileData(
          index,
          tileUrlMap,
          metadata,
          timestampCols,
        );
        return iterableData;
      },
      renderSubLayers: (props) => {
        const { data, pickable, id, ...otherProps } = props;
        if (!data) {
          console.warn("No data for tile", props.tile.index);
          return null;
        }

        const scatterLayer = new CustomScatterplotLayer({
          id: `scatter‑layer‑${props.tile.index.z}-${props.tile.index.x}-${props.tile.index.y}`,
          data,
          currentHover: {
            index: currentHover.index,
            layerId: currentHover.layerId,
          },
          getPosition: (_, { index, data, target }) => {
            // incoming data does not have set typing--though can assume x, y, ix exist
            target[0] = data.src.x[index];
            target[1] = data.src.y[index];
            return target;
          },
          getFillColor: fillColorAccessor,
          radiusUnits: "meters",
          radiusMinPixels: getViewSettings(metadata).radiusMinPixels,
          radiusScale: getViewSettings(metadata).radiusScale,
          visible: true,
          pickable: true,
          ...otherProps,
        });

        const polygonLayer = new PolygonLayer({
          id: `polygon-layer-${props.tile.index.z}-${props.tile.index.x}-${props.tile.index.y}`,
          positionFormat: "XY",
          getFillColor: [255, 0, 0, 100],
          data: [props.tile.boundingBox],
          pickable: false,
          getLineWidth: 0.1,
          opacity: 0.4,
          visible: props.tile.index.z === 2,
          getPolygon: (bbox) => {
            const [min, max] = bbox;
            const [xMin, yMin] = min;
            const [xMax, yMax] = max;
            return [
              [xMin, yMin],
              [xMax, yMin],
              [xMax, yMax],
              [xMin, yMax],
              [xMin, yMin],
            ];
          },
        });

        return [scatterLayer, polygonLayer];
      },
      onTileError: (tile, error) => {
        console.error("Tile load error:", tile, tile.index, error);
      },
    });

  const queryLayer =
    metadata &&
    new CustomScatterplotLayer({
      id: `query-layer`,
      data: queryData,
      currentHover: {
        index: currentHover.index,
        layerId: currentHover.layerId,
      },
      getRadius: (_: any, { data }) => {
        return getQueriedMSizeultiplier(
          hashes,
          Number(metadata.tiles["0/0_0"].node_count),
        );
      },
      getPosition: (_, { index, data, target }) => {
        // incoming data does not have set typing--though can assume x, y, ix exist
        target[0] = data.src.x[index];
        target[1] = data.src.y[index];
        return target;
      },
      getFillColor: queryFillColorAccessor,
      radiusUnits: "meters",
      radiusMinPixels: getViewSettings(metadata).radiusMinPixels,
      radiusScale: getViewSettings(metadata).radiusScale,
      visible: true,
      pickable: true,
      autoHighlight: true,
      updateTriggers: {
        getFillColor: [hashes, colorBy],
        getRadius: [hashes],
      },
      onHover: (info) => {
        if (info.object) {
          setTab((prev) => ({
            ...prev,
            currentHover: {
              index: info.index,
              layerId: "query-layer",
              data: info.object,
            },
          }));
        }
      },
    });

  return (
    <>
      {metadata && (
        <DeckGL
          views={new OrthographicView({ id: "ortho" })}
          initialViewState={{
            target: [metadata.extent.size / 2, metadata.extent.size / 2, 0], //always [50, 50, 0] now
            zoom: 2.5,
            minZoom: 2.5,
          }}
          layers={[tileLayer, queryLayer]}
          controller={true}
          // style={{ backgroundColor: "hsl(var(--muted))" }}
          getCursor={({ isDragging, isHovering }) =>
            isDragging ? "grabbing" : isHovering ? "pointer" : "default"
          }
          useDevicePixels={false}
          onAfterRender={handleAfterRender} // tell colorBy that category map is ready (via deckglLoaded)
        />
      )}
    </>
  );
}
