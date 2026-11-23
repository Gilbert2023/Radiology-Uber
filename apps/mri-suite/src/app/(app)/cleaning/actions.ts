"use server";
import { runAction, type ActionResult } from "@/server/action";
import { formToObject } from "@/server/validation";
import * as ops from "@/server/services/operations";
type A = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
export const cleaningAction: A = async (_, fd) => runAction(async (actor) => { const o = formToObject(fd); const r = await ops.recordCleaning(actor, { ...o, items: o.items ?? [] }); return r.compliant ? "Cleaning recorded – compliant." : "Cleaning recorded – NOT fully compliant."; }, "/cleaning");
export const verifyCleaningAction: A = async (_, fd) => runAction(async (actor) => { await ops.verifyCleaning(actor, String(fd.get("id"))); return "Verified."; }, "/cleaning");
