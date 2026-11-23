import type { DisplayStatus } from "./constants";

export interface StatusInput {
  status: string;
  screening_status?: string | null;
  scheduled_start: string | Date;
  arrived_at?: string | Date | null;
}
export interface StatusThresholds { waitingStatusMinutes: number; lateGraceMinutes: number; waitAlertMinutes: number }

/** Map workflow status + timing to the colour-coded display status. */
export function displayStatus(a: StatusInput, t: StatusThresholds, now = new Date()): DisplayStatus {
  const start = new Date(a.scheduled_start).getTime();
  switch (a.status) {
    case "BOOKED":
      return now.getTime() > start + t.lateGraceMinutes * 60000 ? "DELAYED" : "CONFIRMED";
    case "ARRIVED": {
      const waited = a.arrived_at ? (now.getTime() - new Date(a.arrived_at).getTime()) / 60000 : 0;
      if (waited >= t.waitAlertMinutes) return "DELAYED";
      return waited >= t.waitingStatusMinutes ? "WAITING" : "ARRIVED";
    }
    case "SCREENING":
      return a.screening_status === "NOT_CLEARED" ? "NOT_CLEARED" : "SAFETY_PENDING";
    case "PREPARATION": return "IN_PREPARATION";
    case "CLEARED": return "CLEARED";
    case "SCANNING": return "SCANNING";
    case "SCANNED": return "PACS_PENDING";
    case "COMPLETED": return "COMPLETED";
    case "INCOMPLETE": return "INCOMPLETE";
    case "CANCELLED": return "CANCELLED";
    case "NO_SHOW": return "NO_SHOW";
    default: return "CONFIRMED";
  }
}

/** Index (0-6) of the furthest journey stage reached. */
export function journeyIndex(status: string, screening?: string | null, prep?: string | null): number {
  switch (status) {
    case "BOOKED": return 0;
    case "ARRIVED": return 1;
    case "SCREENING": return 2;
    case "PREPARATION": return 3;
    case "CLEARED": return 3;
    case "SCANNING": return 4;
    case "SCANNED": return 5;
    case "INCOMPLETE": return 5;
    case "COMPLETED": return 6;
    default: return 0;
  }
}

export const ACTIVE_STATUSES = ["ARRIVED", "SCREENING", "PREPARATION", "CLEARED", "SCANNING"];
export const PRE_SCAN_STATUSES = ["ARRIVED", "SCREENING", "PREPARATION", "CLEARED"];
