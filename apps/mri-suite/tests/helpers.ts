// Test bootstrap: points the app at TEST_DATABASE_URL, rebuilds schema and seeds demo data.
import "../scripts/loadenv";
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL must be set for tests");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

import { migrate } from "../scripts/migrate";
import { seed } from "../scripts/seed";
import { getPool, one, q } from "../src/lib/db";
import type { Actor } from "../src/server/actor";
import { localDate, addDays, weekday, zonedToUtc, localTime } from "../src/lib/time";
import { DEFAULT_SETTINGS } from "../src/server/settings";

let ready: Promise<void> | null = null;
export function setup() {
  ready ??= (async () => { await migrate({ reset: true, quiet: true }); await seed({ quiet: true }); })();
  return ready;
}
export async function teardown() { await getPool().end(); }

export async function actor(username: string): Promise<Actor> {
  const u = await one(`SELECT u.*, r.code, r.name AS role_name, r.id AS rid FROM users u JOIN roles r ON r.id=u.role_id WHERE username=$1`, [username]);
  const perms = await q(`SELECT permission_code FROM role_permissions WHERE role_id=$1`, [u.rid]);
  const h = await one(`SELECT id FROM hospitals LIMIT 1`);
  return { userId: u.id, username, fullName: u.full_name, roleCode: u.code, roleName: u.role_name, staffId: u.staff_id, hospitalId: h.id, permissions: new Set(perms.map((p) => p.permission_code)) };
}

/** A dedicated scanner so tests never collide with seeded bookings. */
export async function testScanner(name = "TEST scanner") {
  const h = await one(`SELECT id FROM hospitals LIMIT 1`);
  return (await one(`INSERT INTO scanners (hospital_id, name, manufacturer, model, field_strength_t) VALUES ($1,$2,'GE HealthCare','SIGNA Creator',1.5) ON CONFLICT (hospital_id, name) DO UPDATE SET status='AVAILABLE' RETURNING *`, [h.id, name]))!;
}
export async function examType(code = "BRAIN") { return (await one(`SELECT * FROM exam_types WHERE code=$1`, [code]))!; }
let mrnSeq = 0;
export async function newPatient(sex = "MALE", dob = "1980-05-05") {
  const h = await one(`SELECT id FROM hospitals LIMIT 1`);
  return (await one(`INSERT INTO patients (hospital_id, mrn, full_name, dob, sex, is_demo) VALUES ($1,$2,$3,$4,$5,true) RETURNING *`, [h.id, `TEST-${Date.now()}-${mrnSeq++}`, `Test Patient ${mrnSeq}`, dob, sex]))!;
}
/** Next operating weekday at least `minDays` ahead. */
export function nextOperatingDay(minDays = 2) {
  let d = addDays(localDate(), minDays);
  while (!DEFAULT_SETTINGS.operatingHours[String(weekday(d))]) d = addDays(d, 1);
  return d;
}
/** A time today a few minutes ago, for arrival-eligible appointments (emergency bypasses operating hours). */
export function nowSlot(offsetMin = 0) {
  const t = new Date(Date.now() + offsetMin * 60000);
  return { date: localDate(t), time: localTime(t) };
}
export { q, one, zonedToUtc };
