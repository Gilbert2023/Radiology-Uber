import { Pool, type PoolClient, type QueryResultRow } from "pg";

// pg returns numeric/bigint as strings by default; parse to JS numbers for analytics.
import pg from "pg";
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // numeric
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10))); // int8
pg.types.setTypeParser(1082, (v) => v); // date -> keep 'YYYY-MM-DD' string

declare global {
  // eslint-disable-next-line no-var
  var __mriPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__mriPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not configured");
    global.__mriPool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
  }
  return global.__mriPool;
}

/** A queryable: either the pool or a transaction client. */
export type Db = Pick<PoolClient, "query">;

export async function q<T extends QueryResultRow = any>(sql: string, params: unknown[] = [], db?: Db): Promise<T[]> {
  const res = await (db ?? getPool()).query<T>(sql, params as any[]);
  return res.rows;
}

export async function one<T extends QueryResultRow = any>(sql: string, params: unknown[] = [], db?: Db): Promise<T | null> {
  const rows = await q<T>(sql, params, db);
  return rows[0] ?? null;
}

/** Run fn inside a database transaction (rolls back on any thrown error). */
export async function tx<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
