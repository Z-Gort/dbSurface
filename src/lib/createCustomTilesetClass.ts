import { _Tileset2D as Tileset2D } from "@deck.gl/geo-layers";

//mostly rewritten from deck.gl with minor changes

const DEFAULT_EXTENT: any = [-Infinity, -Infinity, Infinity, Infinity];
const TILE_SIZE = 512;

function getScale(z: number, tileSize: number): number {
  return (Math.pow(2, z) * TILE_SIZE) / tileSize;
}

function getBoundingBox(
  viewport: any,
  zRange: number[] | null,
  extent: any,
): any {
  let bounds;
  if (zRange && zRange.length === 2) {
    const [minZ, maxZ] = zRange;
    const bounds0 = viewport.getBounds({ z: minZ });
    const bounds1 = viewport.getBounds({ z: maxZ });
    bounds = [
      Math.min(bounds0[0], bounds1[0]),
      Math.min(bounds0[1], bounds1[1]),
      Math.max(bounds0[2], bounds1[2]),
      Math.max(bounds0[3], bounds1[3]),
    ];
  } else {
    bounds = viewport.getBounds();
  }
  if (!viewport.isGeospatial) {
    return [
      // Top corner should not be more then bottom corner in either direction
      Math.max(Math.min(bounds[0], extent[2]), extent[0]),
      Math.max(Math.min(bounds[1], extent[3]), extent[1]),
      // Bottom corner should not be less then top corner in either direction
      Math.min(Math.max(bounds[2], extent[0]), extent[2]),
      Math.min(Math.max(bounds[3], extent[1]), extent[3]),
    ];
  }
  return [
    Math.max(bounds[0], extent[0]),
    Math.max(bounds[1], extent[1]),
    Math.min(bounds[2], extent[2]),
    Math.min(bounds[3], extent[3]),
  ];
}

function getIndexingCoords(
  bbox: any,
  scale: number,
  modelMatrixInverse?: any,
): any {
  if (modelMatrixInverse) {
    const transformedTileIndex = transformBox(bbox, modelMatrixInverse).map(
      (i: any) => (i * scale) / TILE_SIZE,
    );
    return transformedTileIndex as any;
  }
  return bbox.map((i: any) => (i * scale) / TILE_SIZE) as any;
}

function transformBox(bbox: any, modelMatrix: any): any {
  const transformedCoords = [
    // top-left
    modelMatrix.transformAsPoint([bbox[0], bbox[1]]),
    // top-right
    modelMatrix.transformAsPoint([bbox[2], bbox[1]]),
    // bottom-left
    modelMatrix.transformAsPoint([bbox[0], bbox[3]]),
    // bottom-right
    modelMatrix.transformAsPoint([bbox[2], bbox[3]]),
  ];
  const transformedBox: any = [
    // Minimum x coord
    Math.min(...transformedCoords.map((i) => i[0])),
    // Minimum y coord
    Math.min(...transformedCoords.map((i) => i[1])),
    // Max x coord
    Math.max(...transformedCoords.map((i) => i[0])),
    // Max y coord
    Math.max(...transformedCoords.map((i) => i[1])),
  ];
  return transformedBox;
}

//modified from original
function getIdentityTileIndices(
  viewport: any,
  z: number,
  minZoom: any,
  tileSize: number,
  extent: any,
  tileIdSet: Set<string>,
  modelMatrixInverse?: any,
) {
  const zoom = z;
  const indices: any[] = []; //always show query result tile
  for (let z = minZoom; z < zoom + 1; z++) {
    const bbox = getBoundingBox(viewport, null, extent);
    const scale = getScale(z, tileSize);
    const [minX, minY, maxX, maxY] = getIndexingCoords(
      bbox,
      scale,
      modelMatrixInverse,
    );

    /*
      |  TILE  |  TILE  |  TILE  |
        |(minX)            |(maxX)
   */
    for (let x = Math.floor(minX); x < maxX; x++) {
      for (let y = Math.floor(minY); y < maxY; y++) {
        if (tileIdSet.has(`${x},${y},${z}`)) {
          indices.push({ x, y, z });
        }
      }
    }
  }
  return indices;
}

export function createCustomTilesetClass(tileIdSet: Set<string>) {
  return class CustomTilesetClass extends Tileset2D {
    tileIdSet: Set<string>;
    constructor(opts: any) {
      super(opts);
      this.tileIdSet = tileIdSet;
    }

    getTileIndices({
      viewport,
      maxZoom,
      minZoom,
      zRange,
      modelMatrix,
      modelMatrixInverse,
    }: {
      viewport: any;
      maxZoom?: number;
      minZoom?: number;
      zRange: any | null;
      tileSize?: number;
      modelMatrix?: any;
      modelMatrixInverse?: any;
      zoomOffset?: number;
    }): any[] {
      const { tileSize, extent, zoomOffset } = this.opts;
      const tileIdSet = this.tileIdSet;
      let z = Math.ceil(viewport.zoom) + zoomOffset;
      if (
        typeof minZoom === "number" &&
        Number.isFinite(minZoom) &&
        z < minZoom
      ) {
        if (!extent) {
          return [];
        }
        z = minZoom;
      }
      if (
        typeof maxZoom === "number" &&
        Number.isFinite(maxZoom) &&
        z > maxZoom
      ) {
        z = maxZoom;
      }
      let transformedExtent = extent;
      if (
        modelMatrix &&
        modelMatrixInverse &&
        extent &&
        !viewport.isGeospatial
      ) {
        transformedExtent = transformBox(extent, modelMatrix);
      }
      // You can now use this.tileIdSet for additional filtering or custom logic
      return getIdentityTileIndices(
        viewport,
        z,
        minZoom,
        tileSize,
        transformedExtent || DEFAULT_EXTENT,
        tileIdSet,
        modelMatrixInverse,
      );
    }
  };
}
