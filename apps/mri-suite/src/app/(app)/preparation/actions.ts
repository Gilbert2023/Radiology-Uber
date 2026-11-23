"use server";
import { runAction, type ActionResult } from "@/server/action";
import { formToObject } from "@/server/validation";
import { savePrepProtocol, approvePrepProtocol } from "@/server/services/protocols";
type A = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
export const savePrepProtocolAction: A = async (_, fd) => runAction(async (actor) => { const o = formToObject(fd); await savePrepProtocol(actor, o.id, o as any); return "Preparation protocol saved as draft (requires approval)."; }, "/preparation");
export const approvePrepProtocolAction: A = async (_, fd) => runAction(async (actor) => { await approvePrepProtocol(actor, String(fd.get("id"))); return "Preparation protocol approved."; }, "/preparation");
