import type { Permission } from "./rbac";

export interface NavItem { label: string; href: string; icon: string; any: Permission[]; noHome?: boolean }
export interface NavGroup { label: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  { label: "Overview", items: [
    { label: "MRI Suite Command Centre", href: "/command-centre", icon: "MonitorDot", any: ["dashboard.command"] },
    { label: "Supervisor Executive Dashboard", href: "/executive", icon: "LayoutDashboard", any: ["dashboard.executive"] },
  ] },
  { label: "Patient Management", items: [
    { label: "MRI Appointment Scheduling", href: "/appointments", icon: "CalendarDays", any: ["appointments.view"] },
    { label: "Appointment Audit Trail", href: "/appointments/audit", icon: "ScrollText", any: ["appointments.audit", "admin.audit"], noHome: true },
    { label: "Patient Registration", href: "/patients", icon: "UserPlus", any: ["patients.view"] },
    { label: "Patient Worklist", href: "/worklist", icon: "ClipboardList", any: ["appointments.view"] },
    { label: "Patient Arrival & Tracking", href: "/arrivals", icon: "DoorOpen", any: ["arrival.record"] },
    { label: "MRI Safety Screening", href: "/screening", icon: "ShieldCheck", any: ["screening.view"] },
    { label: "Patient Preparation", href: "/preparation", icon: "ListChecks", any: ["prep.manage", "prep.protocols.manage"] },
    { label: "MRI Implant & Device Registry", href: "/implants", icon: "Cpu", any: ["implants.view"] },
  ] },
  { label: "MRI Operations", items: [
    { label: "Daily Examination Register", href: "/register", icon: "BookOpen", any: ["scanning.perform", "pacs.view", "analytics.view"] },
    { label: "MRI Protocol Library", href: "/protocols", icon: "Layers", any: ["protocols.view"] },
    { label: "Scanning Activity Log", href: "/scanning", icon: "ScanLine", any: ["scanning.perform", "pacs.view"] },
    { label: "PACS Upload Tracking", href: "/pacs", icon: "UploadCloud", any: ["pacs.view"] },
  ] },
  { label: "Departmental Operations", items: [
    { label: "Contrast Media Management", href: "/contrast", icon: "Droplets", any: ["contrast.view"] },
    { label: "Equipment Quality Control", href: "/qc", icon: "Gauge", any: ["qc.view"] },
    { label: "Equipment Maintenance", href: "/maintenance", icon: "Wrench", any: ["maintenance.view"] },
    { label: "Staff & Duty Management", href: "/staff", icon: "Users", any: ["staff.view"] },
    { label: "Incident & Safety Reporting", href: "/incidents", icon: "TriangleAlert", any: ["incidents.report", "incidents.view"] },
    { label: "Cleaning & Infection Control", href: "/cleaning", icon: "SprayCan", any: ["cleaning.view", "cleaning.record"] },
  ] },
  { label: "Management & Reporting", items: [
    { label: "MRI Performance Analytics", href: "/analytics/performance", icon: "BarChart3", any: ["analytics.view"] },
    { label: "Scanner Utilisation", href: "/analytics/utilisation", icon: "Activity", any: ["analytics.view"] },
    { label: "Patient Waiting Time Analysis", href: "/analytics/waiting", icon: "Timer", any: ["analytics.view"] },
    { label: "Staff Performance", href: "/analytics/staff", icon: "UserCheck", any: ["analytics.view"] },
    { label: "Monthly Departmental Reports", href: "/reports", icon: "FileText", any: ["analytics.view"] },
  ] },
  { label: "Administration", items: [
    { label: "User Management", href: "/admin/users", icon: "UserCog", any: ["admin.users"] },
    { label: "Roles & Permissions", href: "/admin/roles", icon: "KeyRound", any: ["admin.roles"] },
    { label: "System Settings", href: "/admin/settings", icon: "Settings", any: ["admin.settings"] },
    { label: "Audit Logs", href: "/admin/audit", icon: "ScrollText", any: ["admin.audit"] },
  ] },
];

export function visibleNav(perms: Set<string>): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.any.some((p) => perms.has(p))) })).filter((g) => g.items.length);
}
export function homeFor(perms: Set<string>): string {
  // Incident reporting is available to everyone, so it is only a landing page of last resort.
  for (const g of NAV) for (const i of g.items) if (!i.noHome && i.any.some((p) => p !== "incidents.report" && perms.has(p))) return i.href;
  return perms.has("incidents.report") ? "/incidents" : "/account/password";
}
