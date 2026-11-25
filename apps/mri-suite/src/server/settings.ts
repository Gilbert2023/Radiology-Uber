import { q, one, type Db } from "@/lib/db";

export interface OperatingDay { open: string; close: string } // close "24:00" = open until midnight
export const is24h = (h: OperatingDay | null | undefined) => !!h && h.open === "00:00" && h.close === "24:00";
export interface DeptSettings {
  operatingHours: Record<string, OperatingDay | null>; // keys "0".."6" (0 = Sunday)
  waitAlertMinutes: number;
  waitingStatusMinutes: number;
  lateGraceMinutes: number;
  pacsPendingAlertMinutes: number;
  maintenanceDueDays: number;
  contrastExpiryDays: number;
  slotMinutes: number;
  monitorModeDefault: boolean;
  sessionIdleMinutes: number;
  uploadMaxMb: number;
}

export const DEFAULT_SETTINGS: DeptSettings = {
  operatingHours: Object.fromEntries(["0", "1", "2", "3", "4", "5", "6"].map((d) => [d, { open: "00:00", close: "24:00" }])), // 24/7 MRI unit
  waitAlertMinutes: 45,
  waitingStatusMinutes: 15,
  lateGraceMinutes: 15,
  pacsPendingAlertMinutes: 60,
  maintenanceDueDays: 14,
  contrastExpiryDays: 60,
  slotMinutes: 15,
  monitorModeDefault: false,
  sessionIdleMinutes: 30,
  uploadMaxMb: 4, // Vercel limits request bodies to 4.5 MB
};

export const SETTING_DESCRIPTIONS: Record<keyof DeptSettings, string> = {
  operatingHours: "Scanner operating hours per weekday (used for available-hours and utilisation)",
  waitAlertMinutes: "Alert when a patient has waited longer than this since arrival (minutes)",
  waitingStatusMinutes: "Arrived patients are shown as 'Waiting' after this many minutes",
  lateGraceMinutes: "Booked patients not arrived this many minutes after their slot are flagged 'Delayed'",
  pacsPendingAlertMinutes: "Alert when a PACS upload is still pending this long after scan completion (minutes)",
  maintenanceDueDays: "Warn when preventive maintenance is due within this many days",
  contrastExpiryDays: "Warn when a contrast batch expires within this many days",
  slotMinutes: "Calendar slot granularity (minutes)",
  monitorModeDefault: "Shared monitor privacy mode on by default for the Command Centre",
  sessionIdleMinutes: "Sign users out after this many minutes of inactivity",
  uploadMaxMb: "Maximum upload size for documents (MB)",
};

export async function getSettings(db?: Db): Promise<DeptSettings> {
  const rows = await q<{ key: string; value: any }>(`SELECT key, value FROM settings`, [], db);
  const s: any = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in s) s[r.key] = r.value;
  return s as DeptSettings;
}

export async function getHospital(db?: Db) {
  return one<{ id: string; code: string; name: string; department: string; timezone: string; currency: string; address: string | null; phone: string | null }>(
    `SELECT id, code, name, department, timezone, currency, address, phone FROM hospitals WHERE is_active ORDER BY created_at LIMIT 1`, [], db);
}

/** Available scanner minutes in [fromDate, toDateExclusive) for one scanner (operating hours only). */
export function availableMinutes(settings: DeptSettings, fromDate: string, toDateExclusive: string, addDays: (d: string, n: number) => string, weekday: (d: string) => number): number {
  let total = 0;
  for (let d = fromDate; d < toDateExclusive; d = addDays(d, 1)) {
    const h = settings.operatingHours[String(weekday(d))];
    if (!h) continue;
    const [oh, om] = h.open.split(":").map(Number);
    const [ch, cm] = h.close.split(":").map(Number);
    total += Math.max(0, ch * 60 + cm - (oh * 60 + om));
  }
  return total;
}
