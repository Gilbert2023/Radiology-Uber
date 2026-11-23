"use server";
import { runAction, type ActionResult } from "@/server/action";
import { formToObject } from "@/server/validation";
import * as ops from "@/server/services/operations";
type A = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
export const recordQcAction: A = async (_, fd) => runAction(async (actor) => {
  const o = formToObject(fd);
  const values: Record<string, string> = {}, observations: Record<string, string> = {}, manualResults: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) { if (k.startsWith("v_")) values[k.slice(2)] = v as string; if (k.startsWith("o_")) observations[k.slice(2)] = v as string; if (k.startsWith("r_")) manualResults[k.slice(2)] = v as string; }
  const r = await ops.recordQcSession(actor, { ...o, values, observations, manualResults });
  return `QC recorded – overall result: ${r.overall.replace("_", " ")}.`;
}, ["/qc", "/command-centre"]);
export const verifyQcAction: A = async (_, fd) => runAction(async (actor) => { await ops.verifyQcSession(actor, String(fd.get("id"))); return "QC session verified."; }, "/qc");
export const saveQcParamAction: A = async (_, fd) => runAction(async (actor) => { const o = formToObject(fd); await ops.saveQcParameter(actor, o.id || null, o); return "QC parameter saved."; }, "/qc");
