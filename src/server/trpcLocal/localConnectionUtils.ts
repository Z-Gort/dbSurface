import { Pool, type PoolConfig, type QueryResultRow } from "pg";
import { to as copyTo } from "pg-copy-streams";

let pool: Pool | null = null;

//checkIFAppendLimitRequired and SuffixWithLimit adapted from Supabase
export const checkIfAppendLimitRequired = (sql: string, limit = 0) => {
  const cleanedSql = sql.trim().replaceAll("\n", " ").replaceAll(/\s+/g, " ");

  const regMatch = cleanedSql.matchAll(/[a-zA-Z]*[0-9]*[;]+/g);
  const queries = new Array(...regMatch);
  const indexSemiColon = cleanedSql.lastIndexOf(";");
  const hasComments = cleanedSql.includes("--");
  const hasMultipleQueries =
    queries.length > 1 ||
    (indexSemiColon > 0 && indexSemiColon !== cleanedSql.length - 1);

  const appendAutoLimit =
    limit > 0 &&
    !hasComments &&
    !hasMultipleQueries &&
    cleanedSql.toLowerCase().startsWith("select") &&
    !cleanedSql.toLowerCase().match(/fetch\s+first/i) &&
    !cleanedSql.match(/limit$/i) &&
    !cleanedSql.match(/limit;$/i) &&
    !cleanedSql.match(/limit [0-9]* offset [0-9]*[;]?$/i) &&
    !cleanedSql.match(/limit [0-9]*[;]?$/i);
  return { cleanedSql, appendAutoLimit };
};

export const suffixWithLimit = (
  sql: string,
  limit = 0,
  cleanedSql: string,
  appendAutoLimit: boolean,
) => {
  const formattedSql = appendAutoLimit
    ? cleanedSql.endsWith(";")
      ? sql.replace(/[;]+$/, ` limit ${limit};`)
      : `${sql} limit ${limit};`
    : sql;
  return formattedSql;
};

export async function setLocalConnection(config: PoolConfig) {
  if (pool) {
    pool.end().catch(() => {}); // don’t await – let it finish in background
    pool = null; // immediately allow a fresh pool
  }

  pool = new Pool({
    ...config,
    connectionTimeoutMillis: 3000,
    ssl: false,
  });
}

export async function removeLocalConnection() {
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
  }
}

export async function testLocalConnection(): Promise<{
  success: boolean;
  message?: string;
}> {
  if (!pool) {
    return { success: false, message: "Pool is not initialized" };
  }
  try {
    await pool.query("SELECT 1");
    return { success: true };
  } catch (error) {
    console.log(
      "error message",
      error instanceof Error ? error.message : "Unknown error",
    );
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

interface QueryOptions {
  text: string;
  disableLimit?: boolean;
  params?: string[];
  rowLimit?: number;
}

export async function queryWithRowLimit<
  T extends QueryResultRow = QueryResultRow,
>({
  text,
  disableLimit,
  params,
  rowLimit = 1000,
}: QueryOptions): Promise<{ rows: T[]; count: number; limited: boolean }> {
  if (!pool) {
    throw new Error(
      "Local connection not initialized. Try again in a second or ensure you have an active database with a valid local connection.",
    );
  }

  const { cleanedSql, appendAutoLimit } = checkIfAppendLimitRequired(
    text,
    rowLimit,
  );

  const modifiedText = suffixWithLimit(
    text,
    rowLimit,
    cleanedSql,
    appendAutoLimit,
  );

  try {
    let result;
    if (disableLimit) {
      const query = { text, params };
      result = await pool.query<T>(query, params);
    } else {
      result = await pool.query<T>(modifiedText, params);
    }
    // If result is an array (multi-statement), pick the last result with rows
    if (Array.isArray(result)) {
      const reversedResults = [...result].reverse();
      const lastResultWithRows = reversedResults.find(
        (r) => Array.isArray(r.rows) && r.rows.length > 0,
      );
      if (lastResultWithRows) {
        return {
          rows: lastResultWithRows.rows,
          count: lastResultWithRows.rows.length,
          limited: appendAutoLimit,
        };
      }
      // If no result contains rows, return empty
      return {
        rows: [],
        count: 0,
        limited: disableLimit ? false : appendAutoLimit,
      };
    } else {
      // Single-statement query: return its rows
      return {
        rows: result.rows,
        count: result.rows.length,
        limited: disableLimit ? false : appendAutoLimit,
      };
    }
  } catch (error) {
    throw error;
  }
}

export async function measureQueryLatency(
  text: string,
  params?: unknown[],
): Promise<{ serverLatency: string }> {
  if (!pool) {
    throw new Error(
      "Local connection not initialized. Try again in a second or check your database's local connection.",
    );
  }
  const client = await pool.connect();
  try {
    // Prepend EXPLAIN ANALYZE to get the server's execution plan and timing.
    const explainQuery = `EXPLAIN ANALYZE ${text}`;
    const result = await client.query(explainQuery, params);
    let serverLatency = "0ms";

    for (const row of result.rows) {
      const planLine = row["QUERY PLAN"] as string;
      if (planLine.includes("Execution Time:")) {
        const match = planLine.match(/Execution Time: ([0-9.]+) ms/);
        if (match && match[1]) {
          const latencyMs = parseFloat(match[1]);
          // If latency is above or equal to 1000ms, convert to seconds with two decimals.
          if (latencyMs >= 1000) {
            serverLatency = `${(latencyMs / 1000).toFixed(2)}s`;
          } else {
            serverLatency = `${Math.round(latencyMs)}ms`;
          }
        }
      }
    }
    return { serverLatency };
  } catch (error) {
    console.log("explain analyze couldn't be run on this: ", error);
    return { serverLatency: "" };
  } finally {
    client.release();
  }
}

async function* parseInt4(src: NodeJS.ReadableStream) {
  let buf = Buffer.alloc(0);
  let header = true;

  for await (const chunk of src) {
    buf = Buffer.concat([buf, chunk]);

    // skip 19-byte header exactly once
    if (header && buf.length >= 19) {
      buf = buf.slice(19);
      header = false;
    }

    while (buf.length >= 10) {
      const cols = buf.readInt16BE(0);
      if (cols === -1) return;
      const len = buf.readInt32BE(2);
      if (len !== 4) throw new Error("unexpected col length");
      yield buf.readUInt32BE(6);
      buf = buf.subarray(10);
    }
  }
}

export async function copyHashedIdsSharded(
  queryText: string,
  shardCount: number,
): Promise<Uint32Array> {
  const t0 = Date.now();
  if (!pool) throw new Error("No DB pool");
  const cleaned = queryText.trim().replace(/;+\s*$/, "");

  // fire N parallel COPYs
  const shardPromises = Array.from({ length: shardCount }, (_, i) =>
    (async () => {
      const client = await pool!.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
        const sql = `
        WITH
          base AS (${cleaned}),
          hashed AS (
            SELECT
              (('x' || substr(md5(col::text),1,8))::bit(32)::int) AS raw_hash32
            FROM base AS q(col)
          )
        SELECT raw_hash32 AS hash32
        FROM hashed
        WHERE mod(abs(raw_hash32::bigint), ${shardCount}) = ${i}
      `;
        const stream = client.query(
          copyTo(`COPY (${sql}) TO STDOUT (FORMAT binary)`),
        );
        const shardArr: number[] = [];
        for await (const h of parseInt4(stream)) {
          shardArr.push(h);
        }
        await client.query("COMMIT");
        return shardArr;
      } finally {
        client.release();
      }
    })(),
  );

  // wait for all, flatten, return
  const shards = await Promise.all(shardPromises);
  const flat = shards.flat();
  return Uint32Array.from(flat);
}
