"use server";
import { redirect } from "next/navigation";
import { login, logout, getActor } from "@/server/auth";
import { homeFor } from "@/lib/nav";
import { resetPasswordWithToken, changeOwnPassword } from "@/server/services/admin";
import { DomainError } from "@/server/errors";
import type { ActionResult } from "@/server/action";

export async function loginAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const r = await login(String(fd.get("username") || ""), String(fd.get("password") || ""));
  if (!r.ok) return { ok: false, error: r.error };
  if (r.mustChange) redirect("/account/password?required=1");
  const a = await getActor();
  redirect(a ? homeFor(a.permissions) : "/");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

export async function resetPasswordAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const pw = String(fd.get("password") || ""), confirm = String(fd.get("confirm") || "");
  if (pw !== confirm) return { ok: false, error: "Passwords do not match." };
  try { await resetPasswordWithToken(String(fd.get("token") || ""), pw); }
  catch (e) { if (e instanceof DomainError) return { ok: false, error: e.message }; throw e; }
  return { ok: true, message: "Password updated. You can now sign in.", data: { href: "/login?reset=1" } };
}

export async function changePasswordAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const a = await getActor();
  if (!a) return { ok: false, error: "Session expired.", code: "AUTH" };
  const next = String(fd.get("password") || "");
  if (next !== String(fd.get("confirm") || "")) return { ok: false, error: "New passwords do not match." };
  try { await changeOwnPassword(a, String(fd.get("current") || ""), next, a.sessionId); }
  catch (e) { if (e instanceof DomainError) return { ok: false, error: e.message }; throw e; }
  return { ok: true, message: "Password changed.", data: { href: homeFor(a.permissions) } };
}
