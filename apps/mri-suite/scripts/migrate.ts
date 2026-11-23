import "./loadenv";
import fs from "node:fs";
import path from "node:path";
import { getPool } from "../src/lib/db";

/** Enable row-level security on every table and revoke Supabase's public API roles (idempotent). */
const LOCKDOWN = `
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
  END IF;
END $$;`;

export async function migrate({ reset = false, quiet = false } = {}) {
  const pool = getPool();
  if (reset) {
    const url = process.env.DATABASE_URL || "";
    if ((process.env.NODE_ENV === "production" || /supabase\.(co|com)|pooler\.supabase/.test(url)) && process.env.ALLOW_DATABASE_RESET !== "yes-delete-everything")
      throw new Error("Refusing to wipe what looks like a production/Supabase database. (Set ALLOW_DATABASE_RESET=yes-delete-everything only for a throwaway database.)");
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
  // The application connects as the table owner (bypasses RLS); the public Data API roles get nothing.
  await pool.query(LOCKDOWN);
  if (!quiet) console.log("Row-level security enabled on all tables; public API roles have no access.");
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  migrate({ reset: process.argv.includes("--reset") })
    .then(() => { console.log("Migrations complete."); return getPool().end(); })
    .catch((e) => { console.error(e); process.exit(1); });
}
