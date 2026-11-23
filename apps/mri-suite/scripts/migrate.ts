import "./loadenv";
import fs from "node:fs";
import path from "node:path";
import { getPool } from "../src/lib/db";

export async function migrate({ reset = false, quiet = false } = {}) {
  const pool = getPool();
  if (reset) {
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    if (!quiet) console.log("Schema reset.");
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const dir = path.join(process.cwd(), "db", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const applied = new Set((await pool.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [f]);
      await client.query("COMMIT");
      if (!quiet) console.log(`Applied ${f}`);
    } catch (e) {
      await client.query("ROLLBACK");
      console.error(`Migration ${f} failed`);
      throw e;
    } finally {
      client.release();
    }
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  migrate({ reset: process.argv.includes("--reset") })
    .then(() => { console.log("Migrations complete."); return getPool().end(); })
    .catch((e) => { console.error(e); process.exit(1); });
}
