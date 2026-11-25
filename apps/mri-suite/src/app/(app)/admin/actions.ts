"use server";
import { runAction, type ActionResult } from "@/server/action";
import { formToObject } from "@/server/validation";
import * as adm from "@/server/services/admin";
import { DEFAULT_SETTINGS } from "@/server/settings";
type A = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
export const saveUserAction: A = async (_, fd) => runAction(async (actor) => { const o = formToObject(fd); await adm.saveUser(actor, o.id || null, o as any); return "User saved."; }, "/admin/users");
export const resetLinkAction: A = async (_, fd) => runAction(async (actor) => {
  const token = await adm.issuePasswordReset(actor, String(fd.get("id")));
  return { message: `One-time reset link (valid 24 h) – hand it to the user securely: /reset-password/${token}`, data: { token } };
}, "/admin/users");
export const unlockAction: A = async (_, fd) => runAction(async (actor) => { await adm.unlockUser(actor, String(fd.get("id"))); return "Account unlocked."; }, "/admin/users");
export const revokeAction: A = async (_, fd) => runAction(async (actor) => { await adm.revokeSessions(actor, String(fd.get("id"))); return "All sessions revoked."; }, "/admin/users");
export const rolePermsAction: A = async (_, fd) => runAction(async (actor) => { await adm.setRolePermissions(actor, String(fd.get("roleId")), fd.getAll("perms").map(String)); return "Role permissions updated."; }, "/admin/roles");
export const settingsAction: A = async (_, fd) => runAction(async (actor) => {
  const o = formToObject(fd);
  const hours: Record<string, any> = {};
  for (let d = 0; d < 7; d++) hours[d] = o[`allday_${d}`] === "on" ? { open: "00:00", close: "24:00" } : o[`open_${d}`] && o[`close_${d}`] && o[`closed_${d}`] !== "on" ? { open: o[`open_${d}`], close: o[`close_${d}`] } : null;
  const s: any = { operatingHours: hours, monitorModeDefault: o.monitorModeDefault === "on" };
  for (const k of Object.keys(DEFAULT_SETTINGS)) if (!(k in s)) s[k] = o[k];
  await adm.saveSettings(actor, s);
  return "Settings saved.";
}, "/");
export const scannerAction: A = async (_, fd) => runAction(async (actor) => { const o = formToObject(fd); await adm.saveScanner(actor, o.id || null, o); return "Scanner saved."; }, "/admin/settings");
export const examTypeAction: A = async (_, fd) => runAction(async (actor) => { const o = formToObject(fd); await adm.saveExamType(actor, o.id || null, o); return "Examination type saved."; }, "/admin/settings");
export const integrationAction: A = async (_, fd) => runAction(async (actor) => { const o = formToObject(fd); await adm.saveIntegration(actor, o.code, o); return "Integration status saved."; }, "/admin/settings");
