"use server";
import { runAction, type ActionResult } from "@/server/action";
import { formToObject } from "@/server/validation";
import * as imp from "@/server/services/implants";
import { storeDocument } from "@/server/services/documents";
import { CONDITION_FIELDS } from "@/lib/constants";

type A = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
const paths = ["/implants", "/appointments", "/patients", "/screening"];
function implantInput(fd: FormData): Record<string, any> {
  const o = formToObject(fd);
  const conditions: Record<string, string> = {};
  for (const f of CONDITION_FIELDS) if (o[`cond_${f.key}`]) conditions[f.key] = o[`cond_${f.key}`];
  return { ...o, materials: o.materials ?? [], conditions };
}
export const createImplantAction: A = async (_, fd) => runAction(async (actor) => {
  const o = implantInput(fd);
  const r = await imp.createImplant(actor, o as any);
  return { message: "Implant registered.", data: { href: o.appointmentId ? `/appointments/${o.appointmentId}#screening` : `/implants/${r.id}` } };
}, paths);
export const updateImplantAction: A = async (_, fd) => runAction(async (actor) => {
  const o = implantInput(fd);
  await imp.updateImplant(actor, o.id, o as any);
  return { message: "Implant record updated.", data: { href: `/implants/${o.id}` } };
}, paths);
export const verifyImplantAction: A = async (_, fd) => runAction(async (actor) => {
  const o = formToObject(fd);
  const checklist: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(o)) if (k.startsWith("chk_")) checklist[k.slice(4)] = v === "on";
  await imp.recordVerification(actor, o.implantId, { ...o, checklist } as any);
  return "Verification recorded.";
}, paths);
export const uploadDocumentAction: A = async (_, fd) => runAction(async (actor) => {
  await storeDocument(actor, String(fd.get("ownerType")), String(fd.get("ownerId")), String(fd.get("docType") || "OTHER"), (fd.get("title") as string) || null, fd.get("file") as File);
  return "Document uploaded securely.";
}, ["/implants", "/incidents", "/maintenance"]);
export const saveDeviceAction: A = async (_, fd) => runAction(async (actor) => {
  const o = implantInput(fd);
  const r = await imp.saveDeviceReference(actor, o.id || null, o as any);
  return { message: "Device reference saved (unverified until checked against manufacturer documentation).", data: { href: `/implants/devices/${r.id}` } };
}, paths);
export const verifyDeviceAction: A = async (_, fd) => runAction(async (actor) => { await imp.verifyDeviceReference(actor, String(fd.get("id"))); return "Marked as manufacturer-verified."; }, paths);
export const addCategoryAction: A = async (_, fd) => runAction(async (actor) => { await imp.addCategory(actor, String(fd.get("groupName")), String(fd.get("name"))); return "Category added."; }, paths);
