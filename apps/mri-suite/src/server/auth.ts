import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { q, one } from "@/lib/db";
import type { Permission } from "@/lib/rbac";
import type { Actor } from "./actor";
import { audit } from "./audit";
import { sha256 } from "./services/admin";
import { getSettings } from "./settings";

export const SESSION_COOKIE = "mri_session";
const MAX_AGE_MIN = Number(process.env.SESSION_MAX_AGE_MINUTES || 720);
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim() || null;
}

export async function login(username: string, password: string): Promise<{ ok: true; mustChange: boolean } | { ok: false; error: string }> {
  const ip = await clientIp();
  const generic = "Invalid username or password.";
  if (!username || !password) return { ok: false, error: generic };
  const u = await one(`SELECT u.*, r.code AS role_code FROM users u JOIN roles r ON r.id = u.role_id WHERE u.username = $1`, [username.trim()]);
  if (!u) {
    await bcrypt.compare(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv"); // timing equalisation
    await q(`INSERT INTO audit_logs (username, action, ip) VALUES ($1,'auth.login_failed',$2)`, [username.slice(0, 60), ip]);
    return { ok: false, error: generic };
  }
  if (u.locked_until && new Date(u.locked_until) > new Date())
    return { ok: false, error: `Account temporarily locked after repeated failed sign-ins. Try again after ${LOCK_MINUTES} minutes or contact an administrator.` };
  if (!u.is_active) return { ok: false, error: "This account is deactivated." };
  const valid = await bcrypt.compare(password, u.password_hash);
  if (!valid) {
    const failed = u.failed_logins + 1;
    await q(`UPDATE users SET failed_logins=$2::int, locked_until = CASE WHEN $2::int >= $3::int THEN now() + make_interval(mins => $4::int) ELSE locked_until END WHERE id=$1`,
      [u.id, failed, MAX_FAILED, LOCK_MINUTES]);
    await q(`INSERT INTO audit_logs (user_id, username, action, ip, details) VALUES ($1,$2,'auth.login_failed',$3,$4)`, [u.id, u.username, ip, JSON.stringify({ failed })]);
    return { ok: false, error: failed >= MAX_FAILED ? `Too many failed attempts – account locked for ${LOCK_MINUTES} minutes.` : generic };
  }
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  await q(`UPDATE users SET failed_logins=0, locked_until=NULL, last_login_at=now() WHERE id=$1`, [u.id]);
  await q(`DELETE FROM sessions WHERE expires_at < now()`);
  await q(`INSERT INTO sessions (id, user_id, expires_at, ip, user_agent) VALUES ($1,$2, now() + make_interval(mins => $3), $4, $5)`,
    [sha256(token), u.id, MAX_AGE_MIN, ip, (h.get("user-agent") || "").slice(0, 300)]);
  await q(`INSERT INTO audit_logs (user_id, username, action, ip) VALUES ($1,$2,'auth.login',$3)`, [u.id, u.username, ip]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.COOKIE_SECURE === "true", maxAge: MAX_AGE_MIN * 60,
  });
  return { ok: true, mustChange: u.must_change_password };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const s = await one(`DELETE FROM sessions WHERE id=$1 RETURNING user_id`, [sha256(token)]);
    if (s) await q(`INSERT INTO audit_logs (user_id, action) VALUES ($1,'auth.logout')`, [s.user_id]);
  }
  jar.delete(SESSION_COOKIE);
}

export interface SessionActor extends Actor { sessionId: string; mustChangePassword: boolean; idleMinutes: number }

/** Resolve the signed-in user for this request (cached per request). */
export const getActor = cache(async (): Promise<SessionActor | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const sid = sha256(token);
  const row = await one(
    `SELECT s.id AS session_id, s.last_seen_at, s.expires_at, u.id, u.username, u.full_name, u.staff_id, u.is_active, u.must_change_password,
            r.code AS role_code, r.name AS role_name, r.id AS role_id
       FROM sessions s JOIN users u ON u.id = s.user_id JOIN roles r ON r.id = u.role_id WHERE s.id = $1`, [sid]);
  if (!row || !row.is_active || new Date(row.expires_at) < new Date()) return null;
  const settings = await getSettings();
  const idle = settings.sessionIdleMinutes;
  if (Date.now() - new Date(row.last_seen_at).getTime() > idle * 60000) {
    await q(`DELETE FROM sessions WHERE id=$1`, [sid]);
    await q(`INSERT INTO audit_logs (user_id, action) VALUES ($1,'auth.session_timeout')`, [row.id]);
    return null;
  }
  if (Date.now() - new Date(row.last_seen_at).getTime() > 30000) await q(`UPDATE sessions SET last_seen_at=now() WHERE id=$1`, [sid]);
  const perms = await q<{ permission_code: string }>(`SELECT permission_code FROM role_permissions WHERE role_id=$1`, [row.role_id]);
  const hospital = await one(`SELECT id FROM hospitals WHERE is_active ORDER BY created_at LIMIT 1`);
  return {
    sessionId: sid, userId: row.id, username: row.username, fullName: row.full_name, roleCode: row.role_code, roleName: row.role_name,
    staffId: row.staff_id, hospitalId: hospital!.id, permissions: new Set(perms.map((p) => p.permission_code)),
    ip: await clientIp(), mustChangePassword: row.must_change_password, idleMinutes: idle,
  };
});

/** For pages: require a signed-in user (and optionally a permission). */
export async function requireActor(...anyOf: Permission[]): Promise<SessionActor> {
  const a = await getActor();
  if (!a) redirect("/login");
  if (a.mustChangePassword) redirect("/account/password?required=1");
  if (anyOf.length && !anyOf.some((p) => a.permissions.has(p))) redirect(`/access-denied?need=${encodeURIComponent(anyOf.join(","))}`);
  return a;
}

export async function auditView(actor: Actor, entity: string, id: string) {
  await audit(undefined, actor, "record.view", entity, id);
}
