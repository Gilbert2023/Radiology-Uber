"use server";
import { runAction, type ActionResult } from "@/server/action";
import { formToObject } from "@/server/validation";
import { createProtocol, editProtocol, protocolAction as act, SEQ_FIELDS } from "@/server/services/protocols";
type A = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
function input(fd: FormData) {
  const o = formToObject(fd);
  const seqs: Record<string, string>[] = [];
  for (let i = 0; i < 60; i++) {
    if (o[`seq_${i}_name`] === undefined) continue;
    const s: Record<string, string> = {};
    for (const f of SEQ_FIELDS) s[f] = o[`seq_${i}_${f}`] ?? "";
    seqs.push(s);
  }
  return { ...o, sequences: seqs } as any;
}
export const createProtocolAction: A = async (_, fd) => runAction(async (actor) => { const r = await createProtocol(actor, input(fd)); return { message: "Protocol created as draft.", data: { href: `/protocols/${r.id}` } }; }, "/protocols");
export const editProtocolAction: A = async (_, fd) => runAction(async (actor) => { const r = await editProtocol(actor, String(fd.get("id")), input(fd)); return { message: "Protocol saved.", data: { href: `/protocols/${r.id}` } }; }, "/protocols");
export const protocolStatusAction: A = async (_, fd) => runAction(async (actor) => { await act(actor, String(fd.get("id")), String(fd.get("op")) as any); return "Protocol updated."; }, "/protocols");
