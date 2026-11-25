"use server";
import { runAction, type ActionResult } from "@/server/action";
import { formToObject } from "@/server/validation";
import * as ops from "@/server/services/operations";

type A = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
const paths = ["/contrast", "/appointments", "/command-centre", "/incidents"];

export const administerContrastAction: A = async (_, fd) => runAction(async (actor) => {
  const r = await ops.administerContrast(actor, formToObject(fd) as any);
  return r.incidentId ? "Contrast administration recorded, stock updated and an incident report raised." : "Contrast administration recorded and stock updated.";
}, paths);
export const receiveContrastAction: A = async (_, fd) => runAction(async (actor) => { await ops.receiveContrast(actor, formToObject(fd)); return "Stock received."; }, paths);
export const adjustContrastAction: A = async (_, fd) => runAction(async (actor) => { await ops.adjustContrast(actor, formToObject(fd)); return "Stock adjusted."; }, paths);
