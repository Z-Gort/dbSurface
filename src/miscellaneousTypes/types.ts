/* eslint-disable */
// @ts-nocheck

import { z } from "zod";

//from Supabase codebase
const pgFunctionZod = z.object({
  id: z.number(),
  schema: z.string(),
  name: z.string(),
  language: z.string(),
  definition: z.string(),
  complete_statement: z.string(),
  args: z.array(
    z.object({
      mode: z.union([
        z.literal("in"),
        z.literal("out"),
        z.literal("inout"),
        z.literal("variadic"),
        z.literal("table"),
      ]),
      name: z.string(),
      type_id: z.number(),
      has_default: z.boolean(),
    }),
  ),
  argument_types: z.string(),
  identity_argument_types: z.string(),
  return_type_id: z.number(),
  return_type: z.string(),
  return_type_relation_id: z.union([z.number(), z.null()]),
  is_set_returning_function: z.boolean(),
  behavior: z.union([
    z.literal("IMMUTABLE"),
    z.literal("STABLE"),
    z.literal("VOLATILE"),
  ]),
  security_definer: z.boolean(),
  config_params: z.union([z.record(z.string(), z.string()), z.null()]),
});

export type DatabaseFunction = z.infer<typeof pgFunctionZod>;

export type TableColumn = {
  schemaname: string;
  tablename: string;
  quoted_name: string;
  is_table: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: any[];
};

const pgSchemaZod = z.object({
  id: z.number(),
  name: z.string(),
  owner: z.string(),
});

export type Schema = z.infer<typeof pgSchemaZod>;

const extentSchema = z.object({
  size: z.number(),
});

const tileSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    tile_id: z.string(),
    uncompressed_size: z.number(),
    compressed_size: z.number(),
    children: z.array(tileSchema),
    node_count: z.number(),
  }),
);

const metadataSchema = z.object({
  extent: extentSchema,
  colorStats: z.record(z.string(), z.object({ buckets: z.array(z.number()) })),
  tiles: z.record(tileSchema),
});

export type Metadata = z.infer<typeof metadataSchema>;

export interface Columns {
  x?: Float32Array;
  y?: Float32Array;
  ix?: Array<string | number>;
  pkHash?: Uint32Array;
  [col: string]: any;
}

interface nonEmptyColumns {
  x: Float32Array;
  y: Float32Array;
  ix: Array<string | number>;
  pkHash: Uint32Array;
  [col: string]: any;
}

export interface IterableData {
  src: Columns;
  length: number;
}

export interface NonEmptyIterableData {
  src: nonEmptyColumns;
  length: number;
}

export interface TileSource {
  extent?: { size: number };
  colorStats?: Record<string, { buckets: number[] }>;
  tiles?: Record<string, any>;
}
