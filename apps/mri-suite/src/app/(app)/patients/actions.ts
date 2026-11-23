"use server";
import { runAction, type ActionResult } from "@/server/action";
import { formToObject } from "@/server/validation";
import { createPatient, updatePatient } from "@/server/services/patients";
type A = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
export const createPatientAction: A = async (_, fd) => runAction(async (actor) => {
  const o = formToObject(fd);
  const p = await createPatient(actor, o as any);
  return { message: `Patient ${p.full_name} registered.`, data: { href: o.returnTo === "book" ? `/appointments/new?patientId=${p.id}` : `/patients/${p.id}` } };
}, "/patients");
export const updatePatientAction: A = async (_, fd) => runAction(async (actor) => {
  const o = formToObject(fd);
  await updatePatient(actor, o.id, o as any);
  return { message: "Patient updated.", data: { href: `/patients/${o.id}` } };
}, "/patients");
