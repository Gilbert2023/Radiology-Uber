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

/**
 * Transaction that tags the database session with the acting user, so database triggers
 * (e.g. the appointment audit trail) record who made each change automatically.
 */
export async function txAs<T>(actor: { userId: string; fullName?: string; username?: string; roleName?: string }, fn: (db: PoolClient) => Promise<T>): Promise<T> {
  return tx(async (db) => {
    await db.query(`SELECT set_config('app.user_id', $1, true), set_config('app.user_name', $2, true), set_config('app.user_role', $3, true), set_config('app.source', 'MRI Suite application', true)`,
      [actor.userId, actor.fullName ?? actor.username ?? "", actor.roleName ?? ""]);
    return fn(db);
  });
}
