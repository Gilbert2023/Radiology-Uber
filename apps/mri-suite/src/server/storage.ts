// Private document storage.
//  - Supabase Storage (private bucket) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set –
//    required on Vercel, whose filesystem is temporary.
//  - Local disk (UPLOAD_DIR) otherwise – development / on-premise servers.
// Files are never public: they are only served through /api/documents/[id] after a permission check.
import fs from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || "mri-documents";
const supabase = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, ""), key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
};
export const storageBackend = () => (supabase() ? "supabase" : "local");
const safeName = (name: string) => {
  if (!/^[0-9a-f-]{36}\.(pdf|png|jpg)$/.test(name)) throw new Error("Invalid stored file name");
  return name;
};
const headers = (key: string, extra: Record<string, string> = {}) => ({ Authorization: `Bearer ${key}`, apikey: key, ...extra });

export async function putObject(name: string, data: Buffer, contentType: string): Promise<void> {
  safeName(name);
  const sb = supabase();
  if (!sb) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, name), data, { mode: 0o600 });
    return;
  }
  const res = await fetch(`${sb.url}/storage/v1/object/${bucket()}/${name}`, {
    method: "POST", headers: headers(sb.key, { "Content-Type": contentType, "x-upsert": "false" }), body: new Uint8Array(data),
  });
  if (!res.ok) throw new Error(`Document storage upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

export async function getObject(name: string): Promise<Buffer> {
  safeName(name);
  const sb = supabase();
  if (!sb) return fs.readFile(path.join(UPLOAD_DIR, name));
  const res = await fetch(`${sb.url}/storage/v1/object/authenticated/${bucket()}/${name}`, { headers: headers(sb.key) });
  if (!res.ok) throw new Error(`Document storage download failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Creates the private bucket if it does not exist (used by scripts/setup-storage.ts). */
export async function ensureBucket(): Promise<string> {
  const sb = supabase();
  if (!sb) return `Local storage in ${UPLOAD_DIR} (Supabase not configured)`;
  const get = await fetch(`${sb.url}/storage/v1/bucket/${bucket()}`, { headers: headers(sb.key) });
  if (get.ok) {
    const b = await get.json();
    if (b.public) throw new Error(`Bucket "${bucket()}" is PUBLIC – make it private in Supabase before storing patient documents.`);
    return `Bucket "${bucket()}" exists and is private.`;
  }
  const res = await fetch(`${sb.url}/storage/v1/bucket`, {
    method: "POST", headers: headers(sb.key, { "Content-Type": "application/json" }),
    body: JSON.stringify({ id: bucket(), name: bucket(), public: false, file_size_limit: 25 * 1024 * 1024, allowed_mime_types: ["application/pdf", "image/png", "image/jpeg"] }),
  });
  if (!res.ok) throw new Error(`Could not create bucket (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return `Created private bucket "${bucket()}".`;
}
