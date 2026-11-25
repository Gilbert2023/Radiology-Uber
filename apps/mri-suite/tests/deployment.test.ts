// Deployment-readiness: Supabase Storage adapter (against a mock Supabase API), production
// reset guard and row-level-security lockdown.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { setup, teardown, q } from "./helpers";
import { migrate } from "../scripts/migrate";

before(setup);
after(teardown);

describe("Supabase Storage adapter", () => {
  test("uploads and downloads privately with the service key; refuses public buckets and bad names", async () => {
    const store = new Map<string, { body: Buffer; type: string }>();
    const seen: { method: string; url: string; auth?: string; apikey?: string }[] = [];
    let bucketPublic = false;
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        seen.push({ method: req.method!, url: req.url!, auth: req.headers.authorization, apikey: req.headers.apikey as string });
        if (req.headers.authorization !== "Bearer test-service-key") { res.statusCode = 401; return res.end("unauthorised"); }
        const m = req.url!.match(/^\/storage\/v1\/object\/(authenticated\/)?([^/]+)\/(.+)$/);
        if (req.method === "POST" && m && !m[1]) { store.set(`${m[2]}/${m[3]}`, { body: Buffer.concat(chunks), type: req.headers["content-type"]! }); return res.end("{}"); }
        if (req.method === "GET" && m && m[1]) { const o = store.get(`${m[2]}/${m[3]}`); if (!o) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", o.type); return res.end(o.body); }
        if (req.method === "GET" && req.url === "/storage/v1/bucket/mri-documents") { res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ id: "mri-documents", public: bucketPublic })); }
        res.statusCode = 404; res.end();
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as AddressInfo).port;
    process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    try {
      const storage = await import("../src/server/storage");
      assert.equal(storage.storageBackend(), "supabase");
      const name = "123e4567-e89b-12d3-a456-426614174000.pdf";
      const pdf = Buffer.from("%PDF-1.4 test");
      await storage.putObject(name, pdf, "application/pdf");
      assert.ok(store.has(`mri-documents/${name}`));
      assert.equal(store.get(`mri-documents/${name}`)!.type, "application/pdf");
      assert.deepEqual(await storage.getObject(name), pdf);
      assert.ok(seen.every((s) => s.apikey === "test-service-key"));
      assert.ok(seen.some((s) => s.url.includes("/object/authenticated/")), "downloads use the authenticated (private) endpoint");
      await assert.rejects(storage.getObject("../../etc/passwd"), /Invalid stored file name/);
      assert.match(await storage.ensureBucket(), /private/);
      bucketPublic = true;
      await assert.rejects(storage.ensureBucket(), /PUBLIC/);
    } finally {
      delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      server.close();
    }
  });
});

describe("Production safety", () => {
  test("database reset refuses Supabase/production databases", async () => {
    const saved = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://postgres.abc:pw@aws-0-eu-west-2.pooler.supabase.com:6543/postgres";
    try {
      await assert.rejects(migrate({ reset: true, quiet: true }), /Refusing to wipe/);
    } finally { process.env.DATABASE_URL = saved; }
  });
  test("every table has row-level security enabled (blocks Supabase's public Data API)", async () => {
    const off = await q(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity`);
    assert.deepEqual(off.map((r) => r.relname), []);
    // The application (table owner) is unaffected:
    const n = await q(`SELECT count(*)::int AS n FROM appointments`);
    assert.ok(n[0].n > 0);
  });
});
