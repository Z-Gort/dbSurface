import md5 from "spark-md5";
import {
  Columns,
  IterableData,
  NonEmptyIterableData,
  TileSource,
  type Metadata,
} from "~/miscellaneousTypes/types";
import { ZSTDDecoder } from "zstddec";
import { ArrowLoader } from "@loaders.gl/arrow";
import { load } from "@loaders.gl/core";
import { MutableRefObject, SetStateAction, useEffect, useState } from "react";
import { trpc } from "~/lib/client";
import { TabState } from "../TabContext";

export function hash32(val: string | number): number {
  const hex = md5.hash(String(val)) as string;

  return parseInt(hex.slice(0, 8), 16) >>> 0;
}

export function flattenTiles(tilesObj: any): Set<string> {
  const tileSet = new Set<string>();

  function traverse(tile: any) {
    const [zStr, coords] = tile.tile_id.split("/");
    const [xStr, yStr] = coords.split("_");
    const x = parseInt(xStr, 10);
    const y = parseInt(yStr, 10);
    const z = parseInt(zStr, 10);
    tileSet.add(`${x},${y},${z}`);

    if (tile.children && tile.children.length) {
      tile.children.forEach(traverse);
    }
  }
  Object.values(tilesObj).forEach(traverse);

  return tileSet;
}

export function maxZoomFromTiles(tileIdSet: Set<string>) {
  return Math.max(
    ...Array.from(tileIdSet).map((id) => {
      const parts = id.split(",");
      //@ts-ignore
      return parseInt(parts[2], 10);
    }),
  );
}

export type ViewTuning = {
  smallBreak?: number;

  midBreak?: number;

  veryLargeBreak?: number;

  kSmall?: number;
  expSmall?: number;

  kMid?: number;
  expMid?: number;

  kHigh?: number;
  expHigh?: number;

  kVeryHigh?: number;
  expVeryHigh?: number;

  minFloor?: number;
  expSmallPx?: number;
  expBigPx?: number;
};

export function getViewSettings(
  metadata: Metadata,
  {
    smallBreak = 1e4,
    midBreak = 5e4,
    veryLargeBreak = 1.5e6,

    kSmall = 10,
    expSmall = 0.5,
    kMid = 12,
    expMid = 0.45,
    kHigh = 8,
    expHigh = 0.55,

    kVeryHigh = 7,
    expVeryHigh = 0.6,

    minFloor = 0.6,
    expSmallPx = 0.17,
    expBigPx = 0.115,
  }: ViewTuning = {},
) {
  const count = metadata.tiles["0/0_0"].node_count as number;

  const radiusScale =
    count <= smallBreak
      ? Math.min(0.9, kSmall / Math.pow(count, expSmall))
      : count <= midBreak
        ? Math.min(0.9, kMid / Math.pow(count, expMid))
        : count <= veryLargeBreak
          ? Math.min(0.9, kHigh / Math.pow(count, expHigh))
          : Math.min(0.85, kVeryHigh / Math.pow(count, expVeryHigh));

  const expPx = count <= smallBreak ? expSmallPx : expBigPx;
  const radiusMinPixels = Math.min(
    3,
    Math.max(minFloor, 4 / Math.pow(count, expPx)),
  );

  return { radiusScale, radiusMinPixels };
}

export async function loadTileData(
  index: { x: number; y: number; z: number },
  tileUrlMap: TileSource,
  metadata: Metadata,
  timestampCols: React.MutableRefObject<Set<string>>,
): Promise<IterableData> {
  const { x, y, z } = index;
  const tileId = `${z}/${x}_${y}`;
  const signedUrl = tileUrlMap[tileId];
  const response = await fetch(signedUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch tile ${tileId}: ${response.statusText}`);
  }

  const compressedArrayBuffer = await response.arrayBuffer();
  const compressedBytes = new Uint8Array(compressedArrayBuffer);

  const decoder = new ZSTDDecoder();
  await decoder.init();

  const expectedSize = metadata.tiles[tileId].uncompressed_size as number;

  const uncompressedBytes = decoder.decode(compressedBytes, expectedSize);

  const arrowData = await load(
    uncompressedBytes.buffer as ArrayBuffer,
    ArrowLoader,
  );

  const foundTimestampCols = arrowData.schema?.fields
    .filter((field) => field.type === "timestamp-millisecond")
    .map((field) => field.name.replace(/^user_/, ""));

  if (foundTimestampCols) {
    foundTimestampCols.forEach((col) => timestampCols.current.add(col));
  }

  const columns = (arrowData.data as unknown as Columns) ?? {};
  const length = columns.x ? columns.x.length : 0;

  const pkHash = new Uint32Array(length);
  for (let i = 0; i < length; i++) {
    pkHash[i] = hash32(columns.ix[i]);
  }

  columns.pkHash = pkHash;

  const iterableData = {
    src: columns,
    length,
  };

  return iterableData;
}

export async function loadQueryData(
  hashes: Set<number> | undefined,
  tileUrlMap: TileSource,
  metadata: Metadata,
): Promise<IterableData> {
  if (!hashes || hashes.size === 0 || hashes.size > 30_000) {
    return { src: {}, length: 0 };
  }

  const tiles = flattenTiles(metadata.tiles);

  let accumCols: Record<string, any[]> | null = null;
  let ctorMap: Record<string, any> | null = null;
  let foundCount = 0;
  const targetCount = hashes.size;

  for (const tile of tiles) {
    const [x, y, z] = tile.split(",");
    const tileId = `${z}/${x}_${y}`;
    const signedUrl = tileUrlMap[tileId];
    const response = await fetch(signedUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch tile ${tileId}: ${response.statusText}`);
    }

    const compressedArrayBuffer = await response.arrayBuffer();
    const compressedBytes = new Uint8Array(compressedArrayBuffer);

    const decoder = new ZSTDDecoder();
    await decoder.init();

    const expectedSize = metadata.tiles[tileId].uncompressed_size as number;

    const uncompressedBytes = decoder.decode(compressedBytes, expectedSize);

    const arrowData = await load(
      uncompressedBytes.buffer as ArrayBuffer,
      ArrowLoader,
    );

    const dataCols = arrowData.data as unknown as Columns;
    const ixArr = dataCols.ix as Array<string | number>;

    if (!accumCols) {
      // set our accumulator format
      accumCols = {};
      for (const colName of Object.keys(dataCols)) {
        accumCols[colName] = [];
      }
    }

    if (!ctorMap) {
      // get constructor format
      ctorMap = {};
      accumCols = {};
      for (const key of Object.keys(dataCols)) {
        ctorMap[key] = dataCols[key].constructor;
        accumCols[key] = [];
      }
    }

    for (let i = 0; i < ixArr.length; i++) {
      const h = hash32(ixArr[i]);
      if (hashes.has(h)) {
        // copy every column’s i-th value into our accumulators
        for (const colName of Object.keys(dataCols)) {
          accumCols![colName].push((dataCols as any)[colName][i]);
        }
        foundCount++;
        if (foundCount >= targetCount) break;
      }
    }

    if (foundCount >= targetCount) break;
  }

  if (!accumCols) {
    // shouldn't happen
    return { src: {}, length: 0 };
  }

  const finalCols: Record<string, any> = {};
  for (const key of Object.keys(accumCols)) {
    const C = ctorMap![key];
    if (typeof (C as any).from === "function") {
      finalCols[key] = (C as any).from(accumCols[key]);
    } else {
      finalCols[key] = new C(accumCols[key]);
    }
  }
  const pkHashArray = new Uint32Array(foundCount);

  for (let i = 0; i < finalCols.ix.length; i++) {
    pkHashArray[i] = hash32(finalCols.ix[i]);
  }

  finalCols.pkHash = pkHashArray;

  return {
    src: finalCols,
    length: foundCount,
  };
}

export function getFillColor(
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
  }: {
    hashes: Set<number> | undefined;
    colorBy: { column: string; discrete: boolean } | undefined;
    colorScale: (v: number) => [number, number, number, number];
    metadata: Metadata | null;
    categoryMap: MutableRefObject<
      Record<string, [number, number, number, number]>
    >;
    categoryCountRef: MutableRefObject<number>;
    palette: [number, number, number, number][];
    queryColors: {
      primary: [number, number, number, number];
      faded: [number, number, number, number];
    };
    queryData: IterableData;
  },
  _: any,
  index: number,
  data: NonEmptyIterableData,
) {
  // if there are selected hashes
  if (hashes) {
    const pk = data.src.pkHash[index];
    if (hashes.has(pk!)) {
      if (queryData.length > 0) {
        return [0, 0, 0, 0]; //queryLayer is already rendering
      }
      // discrete coloring
      if (colorBy?.discrete) {
        const key = data.src[`user_${colorBy.column}`][index];
        // existing category color
        if (categoryMap.current[key]) {
          return categoryMap.current[key];
        }
        // assign new color if under cap
        if (categoryCountRef.current < 200) {
          categoryCountRef.current += 1;
          const col = palette[categoryCountRef.current % 11];
          categoryMap.current[key] = col;
          return col;
        }
        return palette[11];
      }
      // continuous coloring
      else if (colorBy && !colorBy.discrete) {
        const buckets =
          metadata?.colorStats?.[`user_${colorBy.column}`]?.buckets;
        if (buckets) {
          return colorScale(Number(data.src[`user_${colorBy.column}`][index]));
        }
        return queryColors.primary;
      }
      return queryColors.primary;
    }

    return queryColors.faded;
  }
  // no hashes: continuous if specified
  if (colorBy && !colorBy.discrete) {
    const buckets = metadata?.colorStats?.[`user_${colorBy.column}`]?.buckets;
    if (buckets) {
      return colorScale(Number(data.src[`user_${colorBy.column}`][index]));
    }
    return queryColors.primary;
  }
  // no hashes: discrete if specified
  if (colorBy) {
    const key = data.src[`user_${colorBy.column}`][index];
    if (categoryMap.current[key]) {
      return categoryMap.current[key];
    }
    if (categoryCountRef.current < 200) {
      categoryCountRef.current += 1;
      const col = palette[categoryCountRef.current % 11];
      categoryMap.current[key] = col;
      return col;
    }
    return palette[11];
  }
  // fallback
  return queryColors.primary;
}

export function queryGetFillColor(
  {
    colorBy,
    colorScale,
    metadata,
    categoryMap,
    categoryCountRef,
    palette,
    queryColors,
  }: {
    colorBy: { column: string; discrete: boolean } | undefined;
    colorScale: (v: number) => [number, number, number, number];
    metadata: Metadata | null;
    categoryMap: MutableRefObject<
      Record<string, [number, number, number, number]>
    >;
    categoryCountRef: MutableRefObject<number>;
    palette: [number, number, number, number][];
    queryColors: {
      primary: [number, number, number, number];
      faded: [number, number, number, number];
    };
  },
  _: any,
  index: number,
  data: NonEmptyIterableData,
) {
  // no hashes: continuous if specified
  if (colorBy && !colorBy.discrete) {
    const buckets = metadata?.colorStats?.[`user_${colorBy.column}`]?.buckets;
    if (buckets) {
      return colorScale(Number(data.src[`user_${colorBy.column}`][index]));
    }
    return queryColors.primary;
  }
  // no hashes: discrete if specified
  if (colorBy) {
    const key = data.src[`user_${colorBy.column}`][index];
    if (categoryMap.current[key]) {
      return categoryMap.current[key];
    }
    if (categoryCountRef.current < 200) {
      categoryCountRef.current += 1;
      const col = palette[categoryCountRef.current % 11];
      categoryMap.current[key] = col;
      return col;
    }
    return palette[11];
  }
  // fallback
  return queryColors.primary;
}

export function useQueryData( //hook to load query data and cancels if dependencies change
  hashes: Set<number> | undefined,
  tileUrlMap: TileSource,
  metadata: Metadata | null,
) {
  const [data, setData] = useState<IterableData>({ src: {}, length: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!metadata) return;
    setData({ src: {}, length: 0 });
    let cancelled = false;
    setLoading(true);

    loadQueryData(hashes, tileUrlMap, metadata)
      .then((resolved) => {
        if (!cancelled) {
          setData(resolved);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load query data", err);
          setData({ src: {}, length: 0 });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hashes, tileUrlMap, metadata]);

  return { data, loading };
}

export async function loadAllSignedUrls(
  projectionId: string | undefined,
  setTileUrlMap: (value: SetStateAction<TileSource>) => void,
  setMetadata: (value: SetStateAction<Metadata | null>) => void,
  setTab: (value: SetStateAction<TabState>) => void,
  trpcContext,
) {
  if (!projectionId) {
    // should not happen
    return null;
  }
  const metadataRemotePath = `${projectionId}/metadata.json`;

  const signedMetadataUrls =
    (await trpcContext.client.databases.createSignedUrls.query({
      remotePaths: [metadataRemotePath],
      bucket: "quadtree-tiles",
    })) as { path: string; signedUrl: string }[];
  console.log("signedMetadata urls", signedMetadataUrls);
  if (!signedMetadataUrls?.[0]) {
    console.error("No signedMetadataUrls found");
    return;
  }

  const metadataSignedUrl = signedMetadataUrls[0].signedUrl;
  console.log("signedMetadataurl", metadataSignedUrl);

  const metadataText = await fetch(metadataSignedUrl).then((res) => res.text());

  const parsedMetadata = JSON.parse(metadataText) as Metadata;

  const tileRemotePaths = Object.keys(parsedMetadata.tiles).map(
    (tileId) => `${projectionId}/tiles/${tileId}.arrow.zst`,
  );

  let signedTileUrls;
  try {
    signedTileUrls = (await trpcContext.client.databases.createSignedUrls.query(
      {
        remotePaths: tileRemotePaths,
        bucket: "quadtree-tiles",
      },
    )) as { path: string; signedUrl: string }[];
  } catch (error) {
    console.log("no signed metadata", signedMetadataUrls, error);
  }

  if (!signedTileUrls?.[0]) {
    console.error("No signedMetadataUrls found");
    return;
  }

  const newTileUrlMap = {};
  signedTileUrls.forEach((item) => {
    const parts = item.path.split("/");
    const tileId = `${parts[parts.length - 2]}/${parts[
      parts.length - 1
    ].replace(".arrow.zst", "")}`;
    newTileUrlMap[tileId] = item.signedUrl;
  });

  setTileUrlMap(newTileUrlMap);
  setMetadata(parsedMetadata);

  const continuousCols = Object.keys(parsedMetadata.colorStats).map((col) =>
    col.replace(/^user_/, ""),
  );
  setTab((prev) => ({
    ...prev,
    continuousCols,
  }));
}

export function getQueriedMSizeultiplier(
  hashes: Set<number> | undefined,
  dataLength: number,
): number {
  const hashCount = hashes?.size ?? 0;

  // only apply extra boost when the filter set is small
  if (hashCount < 1000) {
    if (dataLength > 50_000) {
      return 8.5;
    } else if (dataLength > 10_000) {
      return 6;
    }
  }

  // default multiplier
  return 2;
}

//for visualizing tiles if wanted, place inside render sublayers of tileLayer
// const polygonLayer = new PolygonLayer({
//   id: `polygon-layer-${props.tile.index.z}-${props.tile.index.x}-${props.tile.index.y}`,
//   positionFormat: "XY",
//   getFillColor: [255, 0, 0, 100],
//   data: [props.tile.boundingBox],
//   pickable: false,
//   getLineWidth: 0.1,
//   opacity: 0.4,
//   visible: props.tile.index.z === 10,
//   getPolygon: (bbox) => {
//     const [min, max] = bbox;
//     const [xMin, yMin] = min;
//     const [xMax, yMax] = max;
//     return [
//       [xMin, yMin],
//       [xMax, yMin],
//       [xMax, yMax],
//       [xMin, yMax],
//       [xMin, yMin],
//     ];
//   },
// });
