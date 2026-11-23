// Time-zone aware helpers. Storage is UTC (timestamptz); display uses the department zone.
export const TZ = process.env.NEXT_PUBLIC_TIMEZONE || "Africa/Accra";

function parts(d: Date, tz = TZ) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  return o;
}

/** Offset (ms) of tz from UTC at the given instant. */
export function tzOffsetMs(d: Date, tz = TZ): number {
  const p = parts(d, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/** Convert a wall-clock date + time in the department zone into a UTC Date. */
export function zonedToUtc(dateStr: string, timeStr = "00:00", tz = TZ): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const off = tzOffsetMs(guess, tz);
  const result = new Date(guess.getTime() - off);
  const off2 = tzOffsetMs(result, tz); // DST-safe second pass
  return off2 === off ? result : new Date(guess.getTime() - off2);
}

/** YYYY-MM-DD of an instant in the department zone. */
export function localDate(d: Date | string = new Date(), tz = TZ): string {
  const p = parts(new Date(d), tz);
  return `${p.year}-${p.month}-${p.day}`;
}
export function localTime(d: Date | string, tz = TZ): string {
  const p = parts(new Date(d), tz);
  return `${p.hour}:${p.minute}`;
}

export function dayBounds(dateStr: string, tz = TZ): [Date, Date] {
  return [zonedToUtc(dateStr, "00:00", tz), zonedToUtc(addDays(dateStr, 1), "00:00", tz)];
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export function weekday(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
}
export function startOfWeek(dateStr: string): string {
  const wd = weekday(dateStr);
  return addDays(dateStr, wd === 0 ? -6 : 1 - wd); // Monday
}
export function startOfMonth(dateStr: string): string { return dateStr.slice(0, 8) + "01"; }
export function endOfMonthExclusive(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}
export function isDateStr(s: unknown): s is string { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }

export function fmtDate(d: Date | string | null | undefined, tz = TZ): string {
  if (!d) return "—";
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00Z") : new Date(d);
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "short", year: "numeric" }).format(date);
}
export function fmtTime(d: Date | string | null | undefined, tz = TZ): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));
}
export function fmtDateTime(d: Date | string | null | undefined, tz = TZ): string {
  if (!d) return "—";
  return `${fmtDate(d, tz)} ${fmtTime(d, tz)}`;
}
export function fmtLongDate(dateStr: string, tz = TZ): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(dateStr + "T12:00:00Z"));
}
export function minutesBetween(a: Date | string, b: Date | string = new Date()): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}
export function fmtMinutes(min: number | null | undefined): string {
  if (min === null || min === undefined || Number.isNaN(min)) return "—";
  const m = Math.round(min);
  if (Math.abs(m) < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}
export function ageFromDob(dob: string, at = new Date()): number {
  const [y, m, d] = dob.split("-").map(Number);
  let age = at.getUTCFullYear() - y;
  if (at.getUTCMonth() + 1 < m || (at.getUTCMonth() + 1 === m && at.getUTCDate() < d)) age--;
  return age;
}
/** Value for <input type="datetime-local"> in department zone. */
export function toLocalInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  return `${localDate(d)}T${localTime(d)}`;
}
export function fromLocalInput(v: string | null | undefined): Date | null {
  if (!v) return null;
  const [date, time] = v.split("T");
  if (!isDateStr(date) || !time) return null;
  return zonedToUtc(date, time.slice(0, 5));
}
