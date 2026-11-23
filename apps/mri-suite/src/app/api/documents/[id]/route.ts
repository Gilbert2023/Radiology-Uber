import { NextResponse, type NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getActor } from "@/server/auth";
import { one } from "@/lib/db";
import { audit } from "@/server/audit";
import { UPLOAD_DIR } from "@/server/services/documents";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await getActor();
  if (!a) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const d = await one(`SELECT * FROM documents WHERE id=$1`, [id]);
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const need = d.owner_type === "INCIDENT" ? "incidents.view" : d.is_sensitive ? "documents.view_sensitive" : "implants.view";
  if (!a.permissions.has(need as any)) {
    await audit(undefined, a, "document.access_denied", "document", id);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const buf = await fs.readFile(path.join(UPLOAD_DIR, path.basename(d.stored_name)));
  await audit(undefined, a, "document.download", "document", id);
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": d.mime_type, "Content-Disposition": `inline; filename="${d.original_name.replace(/"/g, "")}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
