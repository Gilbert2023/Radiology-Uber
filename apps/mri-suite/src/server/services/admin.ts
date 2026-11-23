// Administration: users, roles & permissions, settings, scanners, exam types, integrations.
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { q, one, tx } from "@/lib/db";
import { PERMISSIONS } from "@/lib/rbac";
import { type Actor, assertCan } from "../actor";
import { audit } from "../audit";
import { DomainError, NotFoundError } from "../errors";
import { DEFAULT_SETTINGS, type DeptSettings } from "../settings";
import { parse, optStr, reqStr, uuid, optUuid, bool } from "../validation";

export const PASSWORD_RULE = "At least 10 characters, including upper- and lower-case letters and a number.";
export function validatePassword(pw: string) {
  if (pw.length < 10 || !/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) throw new DomainError(`Password does not meet policy: ${PASSWORD_RULE}`);
}
export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const userSchema = z.object({
  username: reqStr("Username", 60).pipe(z.string().regex(/^[a-zA-Z0-9._-]{3,60}$/, "3–60 letters, numbers, dots, dashes or underscores")),
  fullName: reqStr("Full name", 200), email: optStr.pipe(z.string().email().nullable()), roleId: uuid, staffId: optUuid, isActive: bool,
  password: optStr,
});

export async function saveUser(actor: Actor, id: string | null, input: z.input<typeof userSchema>) {
  assertCan(actor, "admin.users");
  const d = parse(userSchema, input);
  if (id === actor.userId && !d.isActive) throw new DomainError("You cannot deactivate your own account.");
  return tx(async (db) => {
    try {
      if (id) {
        const cur = await one(`SELECT * FROM users WHERE id=$1 FOR UPDATE`, [id], db);
        if (!cur) throw new NotFoundError("User");
        if (id === actor.userId && cur.role_id !== d.roleId) throw new DomainError("You cannot change your own role.");
        await q(`UPDATE users SET username=$2, full_name=$3, email=$4, role_id=$5, staff_id=$6, is_active=$7, updated_at=now() WHERE id=$1`,
          [id, d.username, d.fullName, d.email, d.roleId, d.staffId, d.isActive], db);
        if (!d.isActive) await q(`DELETE FROM sessions WHERE user_id=$1`, [id], db);
        if (cur.role_id !== d.roleId) await q(`DELETE FROM sessions WHERE user_id=$1`, [id], db);
        await audit(db, actor, "user.update", "user", id, { roleChanged: cur.role_id !== d.roleId, active: d.isActive });
        return { id };
      }
      if (!d.password) throw new DomainError("An initial password is required.");
      validatePassword(d.password);
      const row = await one(`INSERT INTO users (username, full_name, email, role_id, staff_id, is_active, password_hash, must_change_password)
                             VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id`,
        [d.username, d.fullName, d.email, d.roleId, d.staffId, d.isActive, await hashPassword(d.password)], db);
      await audit(db, actor, "user.create", "user", row!.id, { username: d.username });
      return row!;
    } catch (e: any) {
      if (e?.code === "23505") throw new DomainError("Username, email or linked staff record is already in use.");
      throw e;
    }
  });
}

/** Administrator-issued one-time reset link (no email integration yet – link is shown to the admin to hand over securely). */
export async function issuePasswordReset(actor: Actor, userId: string) {
  assertCan(actor, "admin.users");
  const token = randomBytes(32).toString("base64url");
  await tx(async (db) => {
    const u = await one(`SELECT id FROM users WHERE id=$1`, [userId], db);
    if (!u) throw new NotFoundError("User");
    await q(`UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL`, [userId], db);
    await q(`INSERT INTO password_reset_tokens (user_id, token_hash, issued_by, expires_at) VALUES ($1,$2,$3, now() + interval '24 hours')`, [userId, sha256(token), actor.userId], db);
    await audit(db, actor, "user.password_reset_issued", "user", userId);
  });
  return token;
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  validatePassword(newPassword);
  await tx(async (db) => {
    const t = await one(`SELECT * FROM password_reset_tokens WHERE token_hash=$1 FOR UPDATE`, [sha256(token)], db);
    if (!t || t.used_at || new Date(t.expires_at) < new Date()) throw new DomainError("This reset link is invalid or has expired. Ask an administrator for a new one.");
    await q(`UPDATE users SET password_hash=$2, must_change_password=false, failed_logins=0, locked_until=NULL, password_changed_at=now() WHERE id=$1`, [t.user_id, await hashPassword(newPassword)], db);
    await q(`UPDATE password_reset_tokens SET used_at=now() WHERE id=$1`, [t.id], db);
    await q(`DELETE FROM sessions WHERE user_id=$1`, [t.user_id], db);
    await q(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES ($1,'user.password_reset_completed','user',$1)`, [t.user_id], db);
  });
}

export async function changeOwnPassword(actor: Actor, current: string, next: string, currentSessionId: string) {
  validatePassword(next);
  const u = await one(`SELECT password_hash FROM users WHERE id=$1`, [actor.userId]);
  if (!u || !(await bcrypt.compare(current, u.password_hash))) throw new DomainError("Current password is incorrect.");
  if (current === next) throw new DomainError("The new password must be different.");
  await tx(async (db) => {
    await q(`UPDATE users SET password_hash=$2, must_change_password=false, password_changed_at=now() WHERE id=$1`, [actor.userId, await hashPassword(next)], db);
    await q(`DELETE FROM sessions WHERE user_id=$1 AND id<>$2`, [actor.userId, currentSessionId], db);
    await audit(db, actor, "user.password_changed", "user", actor.userId);
  });
}

export async function unlockUser(actor: Actor, userId: string) {
  assertCan(actor, "admin.users");
  await q(`UPDATE users SET failed_logins=0, locked_until=NULL WHERE id=$1`, [userId]);
  await audit(undefined, actor, "user.unlock", "user", userId);
}

export async function revokeSessions(actor: Actor, userId: string) {
  assertCan(actor, "admin.users");
  await q(`DELETE FROM sessions WHERE user_id=$1`, [userId]);
  await audit(undefined, actor, "user.sessions_revoked", "user", userId);
}

export async function setRolePermissions(actor: Actor, roleId: string, perms: string[]) {
  assertCan(actor, "admin.roles");
  const valid = perms.filter((p) => p in PERMISSIONS);
  await tx(async (db) => {
    const role = await one(`SELECT * FROM roles WHERE id=$1`, [roleId], db);
    if (!role) throw new NotFoundError("Role");
    if (role.code === "SYSADMIN" && (!valid.includes("admin.roles") || !valid.includes("admin.users")))
      throw new DomainError("The System Administrator role must keep user and role management permissions (prevents lock-out).");
    const before = (await q(`SELECT permission_code FROM role_permissions WHERE role_id=$1`, [roleId], db)).map((r) => r.permission_code);
    await q(`DELETE FROM role_permissions WHERE role_id=$1`, [roleId], db);
    for (const p of valid) await q(`INSERT INTO role_permissions (role_id, permission_code) VALUES ($1,$2)`, [roleId, p], db);
    const added = valid.filter((p) => !before.includes(p)), removed = before.filter((p) => !valid.includes(p));
    await audit(db, actor, "role.permissions", "role", roleId, { role: role.code, added, removed });
  });
}

export async function saveSettings(actor: Actor, input: Partial<DeptSettings>) {
  assertCan(actor, "admin.settings");
  const num = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
  const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/);
  const d = parse(z.object({
    waitAlertMinutes: num(5, 600), waitingStatusMinutes: num(1, 240), lateGraceMinutes: num(0, 240), pacsPendingAlertMinutes: num(5, 2880),
    maintenanceDueDays: num(1, 120), contrastExpiryDays: num(1, 365), slotMinutes: z.coerce.number().refine((n) => [5, 10, 15, 20, 30].includes(n), "5, 10, 15, 20 or 30"),
    monitorModeDefault: z.boolean(), sessionIdleMinutes: num(5, 240), uploadMaxMb: num(1, 25),
    operatingHours: z.record(z.string(), z.object({ open: hhmm, close: hhmm }).refine((h) => h.close > h.open, "Close must be after open").nullable()),
  }), input);
  await tx(async (db) => {
    for (const [k, v] of Object.entries(d)) {
      if (!(k in DEFAULT_SETTINGS)) continue;
      await q(`INSERT INTO settings (key, value, updated_by, updated_at) VALUES ($1,$2,$3,now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_by=EXCLUDED.updated_by, updated_at=now()`,
        [k, JSON.stringify(v), actor.userId], db);
    }
    await audit(db, actor, "settings.update", "settings", null, d);
  });
}

export async function saveScanner(actor: Actor, id: string | null, input: Record<string, unknown>) {
  assertCan(actor, "admin.settings");
  const d = parse(z.object({ name: reqStr("Scanner name", 80), manufacturer: reqStr("Manufacturer", 80), model: reqStr("Model", 80),
    fieldStrength: z.coerce.number().positive().max(11.7), serialNo: optStr, installedOn: optStr, installationNotes: optStr, location: optStr,
    serviceProvider: optStr, colour: optStr, isActive: bool }), input);
  try {
    const params = [d.name, d.manufacturer, d.model, d.fieldStrength, d.serialNo, d.installedOn || null, d.installationNotes, d.location, d.serviceProvider, d.colour || "#2c3135", d.isActive];
    const r = id
      ? await one(`UPDATE scanners SET name=$2, manufacturer=$3, model=$4, field_strength_t=$5, serial_no=$6, installed_on=$7, installation_notes=$8, location=$9, service_provider=$10, colour=$11, is_active=$12 WHERE id=$1 RETURNING id`, [id, ...params])
      : await one(`INSERT INTO scanners (hospital_id, name, manufacturer, model, field_strength_t, serial_no, installed_on, installation_notes, location, service_provider, colour, is_active) VALUES ($12,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, [...params, actor.hospitalId]);
    await audit(undefined, actor, id ? "scanner.update" : "scanner.create", "scanner", r?.id, d);
  } catch (e: any) {
    if (e?.code === "23505") throw new DomainError("A scanner with this name already exists.");
    throw e;
  }
}

export async function saveExamType(actor: Actor, id: string | null, input: Record<string, unknown>) {
  assertCan(actor, "admin.settings");
  const d = parse(z.object({ code: reqStr("Code", 30), name: reqStr("Name", 160),
    bodyRegion: z.enum(["BRAIN", "HEAD_NECK", "SPINE", "MSK", "ABDOMEN", "PELVIS", "CARDIAC", "VASCULAR", "BREAST", "CHEST", "WHOLE_BODY", "OTHER"]),
    defaultDurationMin: z.coerce.number().int().min(5).max(240), contrastDefault: bool, prepProtocolId: optUuid, isActive: bool }), input);
  try {
    const params = [d.code.toUpperCase(), d.name, d.bodyRegion, d.defaultDurationMin, d.contrastDefault, d.prepProtocolId, d.isActive];
    const r = id
      ? await one(`UPDATE exam_types SET code=$2, name=$3, body_region=$4, default_duration_min=$5, contrast_default=$6, prep_protocol_id=$7, is_active=$8 WHERE id=$1 RETURNING id`, [id, ...params])
      : await one(`INSERT INTO exam_types (code, name, body_region, default_duration_min, contrast_default, prep_protocol_id, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, params);
    await audit(undefined, actor, id ? "exam_type.update" : "exam_type.create", "exam_type", r?.id, d);
  } catch (e: any) {
    if (e?.code === "23505") throw new DomainError("Exam code already exists.");
    throw e;
  }
}

export async function saveIntegration(actor: Actor, code: string, input: Record<string, unknown>) {
  assertCan(actor, "admin.settings");
  const d = parse(z.object({ status: z.enum(["NOT_CONNECTED", "CONFIGURED", "UNDER_DEVELOPMENT"]), endpoint: optStr, notes: optStr }), input);
  // "CONNECTED"/"FAILED" are reserved for a real connector health-check; they cannot be set by hand.
  const r = await one(`UPDATE integrations SET status=$2, endpoint=$3, notes=$4, updated_by=$5, updated_at=now() WHERE code=$1 RETURNING code`, [code, d.status, d.endpoint, d.notes, actor.userId]);
  if (!r) throw new NotFoundError("Integration");
  await audit(undefined, actor, "integration.update", "integration", code, d);
}

