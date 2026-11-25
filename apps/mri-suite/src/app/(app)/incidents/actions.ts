"use server";
import { runAction, type ActionResult } from "@/server/action";
import { formToObject } from "@/server/validation";
import * as ops from "@/server/services/operations";
type A = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
export const reportIncidentAction: A = async (_, fd) => runAction(async (actor) => {
  const r = await ops.reportIncident(actor, formToObject(fd));
  return { message: `Incident ${r.ref_no} reported. Thank you.`, data: { href: actor.permissions.has("incidents.view") ? `/incidents/${r.id}` : "/incidents" } };
}, "/incidents");
export const updateIncidentAction: A = async (_, fd) => runAction(async (actor) => { const o = formToObject(fd); await ops.updateIncident(actor, o.id, o); return "Incident updated."; }, "/incidents");
