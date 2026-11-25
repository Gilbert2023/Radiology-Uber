"use server";
import { runAction, type ActionResult } from "@/server/action";
import { formToObject } from "@/server/validation";
import * as wf from "@/server/services/workflow";
import { SCREENING_QUESTIONS } from "@/lib/constants";

type A = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
const id = (fd: FormData) => String(fd.get("id") || "");
const paths = ["/appointments", "/command-centre", "/worklist", "/arrivals", "/screening", "/preparation", "/pacs", "/scanning", "/register"];

export const createAppointmentAction: A = async (_, fd) => runAction(async (actor) => {
  const r = await wf.createAppointment(actor, formToObject(fd) as any);
  return { message: `Appointment ${r.accession_no} booked.`, data: { href: `/appointments/${r.id}` } };
}, paths);

export const updateAppointmentAction: A = async (_, fd) => runAction(async (actor) => {
  const o = formToObject(fd);
  await wf.updateAppointment(actor, o.id, o as any, o.reason || null);
  return { message: "Appointment updated.", data: { href: `/appointments/${o.id}` } };
}, paths);

export const rescheduleAction: A = async (_, fd) => runAction(async (actor) => {
  const o = formToObject(fd);
  await wf.rescheduleAppointment(actor, o.id, { date: o.date, time: o.time, scannerId: o.scannerId, reason: o.reason });
  return "Appointment rescheduled.";
}, paths);

export const cancelAction: A = async (_, fd) => runAction(async (actor) => { await wf.cancelAppointment(actor, id(fd), String(fd.get("reason") || "")); return "Appointment cancelled."; }, paths);
export const noShowAction: A = async (_, fd) => runAction(async (actor) => { await wf.markNoShow(actor, id(fd)); return "Marked as no-show."; }, paths);
export const reminderAction: A = async (_, fd) => runAction(async (actor) => { await wf.recordReminder(actor, id(fd), (fd.get("note") as string) || null); return "Reminder recorded."; }, paths);

export const arrivalAction: A = async (_, fd) => runAction(async (actor) => {
  await wf.recordArrival(actor, id(fd), { identityVerified: fd.get("identityVerified"), identityMethod: fd.get("identityMethod"), arrivedAt: fd.get("arrivedAt") });
  return "Arrival recorded – patient added to the MRI worklist.";
}, paths);

export const screeningAction: A = async (_, fd) => runAction(async (actor) => {
  const o = formToObject(fd);
  const answers: Record<string, { answer: string | null; details: string | null }> = {};
  for (const qq of SCREENING_QUESTIONS) answers[qq.key] = { answer: o[`q_${qq.key}`] || null, details: o[`d_${qq.key}`]?.trim() || null };
  await wf.saveScreening(actor, o.id, { answers: answers as any, pregnancyStatus: o.pregnancyStatus ?? "", weightKg: o.weightKg, additionalInvestigation: o.additionalInvestigation, notes: o.notes });
  return "Screening saved.";
}, paths);

export const screeningDecisionAction: A = async (_, fd) => runAction(async (actor) => {
  await wf.decideScreening(actor, id(fd), { decision: fd.get("decision"), notes: fd.get("notes") });
  return fd.get("decision") === "CLEAR" ? "Patient cleared for MRI." : "Patient recorded as NOT CLEARED.";
}, paths);

export const assessImplantAction: A = async (_, fd) => runAction(async (actor) => {
  const o = formToObject(fd);
  const comparison: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) if (k.startsWith("cmp_") && v) comparison[k.slice(4)] = v as string;
  await wf.assessImplant(actor, o.assessmentId, { decision: o.decision, comparison: comparison as any, conditionsApplied: o.conditionsApplied, notes: o.notes });
  return "Implant assessment recorded.";
}, [...paths, "/implants"]);

export const prepAction: A = async (_, fd) => runAction(async (actor) => {
  const o = formToObject(fd);
  const checklist: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(o)) if (k.startsWith("chk_")) checklist[k.slice(4)] = v === "on";
  await wf.savePreparation(actor, o.id, { ...o, checklist, complete: o.complete === "1" } as any);
  return o.complete === "1" ? "Preparation completed." : "Preparation saved (in progress).";
}, paths);

export const startScanAction: A = async (_, fd) => runAction(async (actor) => {
  await wf.startScan(actor, id(fd), { radiographerId: fd.get("radiographerId"), protocolId: fd.get("protocolId") });
  return "Scan started.";
}, paths);

export const endScanAction: A = async (_, fd) => runAction(async (actor) => {
  const r = await wf.endScan(actor, id(fd), formToObject(fd) as any);
  return r.warning ? `Scan ended – PACS tracking record created. Note: ${r.warning}` : "Scan ended – PACS upload tracking record created.";
}, paths);

export const scanDetailsAction: A = async (_, fd) => runAction(async (actor) => { await wf.updateScanDetails(actor, id(fd), formToObject(fd)); return "Scan details updated."; }, paths);

export const pacsStatusAction: A = async (_, fd) => runAction(async (actor) => {
  const o = formToObject(fd);
  await wf.updatePacsStatus(actor, o.uploadId, o as any);
  return "PACS status updated.";
}, paths);

export const pacsConfirmAction: A = async (_, fd) => runAction(async (actor) => {
  const r = await wf.confirmPacsUpload(actor, String(fd.get("uploadId")), (fd.get("note") as string) || null);
  return r.completed ? "Upload confirmed – examination COMPLETED." : "Upload confirmed (examination remains an exception – incomplete scan).";
}, paths);
