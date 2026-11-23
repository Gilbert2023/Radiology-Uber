import { randomUUID, createHash } from "node:crypto";
import { one } from "@/lib/db";
import { type Actor, assertAny } from "../actor";
import { audit } from "../audit";
import { DomainError } from "../errors";
import { getSettings } from "../settings";

import { putObject } from "../storage";
const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "application/pdf": { ext: "pdf", magic: (b) => b.subarray(0, 5).toString() === "%PDF-" },
  "image/png": { ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
};
export const OWNER_PERMS: Record<string, string[]> = {
  IMPLANT: ["implants.manage", "implants.verify"], DEVICE_REFERENCE: ["implants.configure"], PATIENT: ["patients.manage"],
  SCREENING: ["screening.record"], INCIDENT: ["incidents.report", "incidents.manage"], MAINTENANCE: ["maintenance.manage"],
};

/** Validates type by content (magic bytes), size and stores outside the public web root. */
export async function storeDocument(actor: Actor, ownerType: string, ownerId: string, docType: string, title: string | null, file: File) {
  const perms = OWNER_PERMS[ownerType];
  if (!perms) throw new DomainError("Invalid document owner.");
  assertAny(actor, ...(perms as any));
  if (!file || file.size === 0) throw new DomainError("Choose a file to upload.");
  const { uploadMaxMb } = await getSettings();
  if (file.size > uploadMaxMb * 1024 * 1024) throw new DomainError(`File exceeds the ${uploadMaxMb} MB limit.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const t = TYPES[file.type];
  if (!t || !t.magic(buf)) throw new DomainError("Only PDF, PNG or JPEG files are accepted (file content did not match an allowed type).");
  const stored = `${randomUUID()}.${t.ext}`;
  await putObject(stored, buf, file.type);
  const safeName = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 150);
  const row = await one(`INSERT INTO documents (owner_type, owner_id, doc_type, title, original_name, stored_name, mime_type, size_bytes, sha256, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, [ownerType, ownerId, docType, title, safeName, stored, file.type, buf.length, createHash("sha256").update(buf).digest("hex"), actor.userId]);
  await audit(undefined, actor, "document.upload", "document", row!.id, { ownerType, ownerId, docType, size: buf.length });
  return row!;
}
