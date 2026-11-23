// Permission catalogue and default role grants (least privilege).
// The database is the source of truth at runtime; this file seeds it and documents defaults.

export const PERMISSIONS = {
  // Dashboards
  "dashboard.command": { module: "Overview", description: "View the MRI Suite Command Centre" },
  "dashboard.executive": { module: "Overview", description: "View the MRI Supervisor Executive Dashboard" },
  // Patient management
  "patients.view": { module: "Patients", description: "View patient demographics and history", sensitive: true },
  "patients.manage": { module: "Patients", description: "Register and edit patients" },
  "appointments.view": { module: "Appointments", description: "View appointment calendar and worklist" },
  "appointments.manage": { module: "Appointments", description: "Create, edit, reschedule and cancel appointments" },
  "appointments.reminders": { module: "Appointments", description: "Record appointment reminders" },
  "arrival.record": { module: "Arrival", description: "Record patient arrival and identity verification" },
  // Safety
  "screening.view": { module: "MRI Safety", description: "View MRI safety screening", sensitive: true },
  "screening.record": { module: "MRI Safety", description: "Record MRI safety screening responses" },
  "safety.clear.routine": { module: "MRI Safety", description: "Clear routine screenings (all answers negative, no implants)" },
  "safety.clear": { module: "MRI Safety", description: "Final MRI safety clearance decision for any screening", sensitive: true },
  // Implants
  "implants.view": { module: "Implant Registry", description: "View implant and device records", sensitive: true },
  "implants.manage": { module: "Implant Registry", description: "Register and edit patient implant records" },
  "implants.verify": { module: "Implant Registry", description: "Record implant verification", sensitive: true },
  "implants.assess": { module: "Implant Registry", description: "Record exam-specific MR safety assessment of an implant", sensitive: true },
  "implants.configure": { module: "Implant Registry", description: "Manage implant categories and device reference database" },
  "devices.verify": { module: "Implant Registry", description: "Mark device reference data as manufacturer-verified", sensitive: true },
  "documents.view_sensitive": { module: "Documents", description: "Open sensitive uploaded documents", sensitive: true },
  // Preparation & operations
  "prep.manage": { module: "Preparation", description: "Record patient preparation (cannulation, fasting, etc.)" },
  "prep.protocols.manage": { module: "Preparation", description: "Edit preparation protocols" },
  "prep.protocols.approve": { module: "Preparation", description: "Approve preparation protocols" },
  "protocols.view": { module: "Protocol Library", description: "View MRI protocol library" },
  "protocols.edit": { module: "Protocol Library", description: "Create and edit MRI protocols" },
  "protocols.approve": { module: "Protocol Library", description: "Approve / archive MRI protocols" },
  "scanning.perform": { module: "Scanning", description: "Start and complete scans" },
  "pacs.view": { module: "PACS", description: "View PACS upload tracking" },
  "pacs.manage": { module: "PACS", description: "Update PACS upload status" },
  "pacs.verify": { module: "PACS", description: "Confirm and verify successful PACS uploads" },
  "contrast.view": { module: "Contrast", description: "View contrast inventory and administration" },
  "contrast.inventory": { module: "Contrast", description: "Receive and adjust contrast stock" },
  "contrast.administer": { module: "Contrast", description: "Record contrast administration" },
  "qc.view": { module: "Equipment QC", description: "View QC records" },
  "qc.record": { module: "Equipment QC", description: "Record QC sessions" },
  "qc.verify": { module: "Equipment QC", description: "Verify QC sessions" },
  "qc.configure": { module: "Equipment QC", description: "Configure QC parameters and thresholds" },
  "maintenance.view": { module: "Maintenance", description: "View equipment maintenance" },
  "maintenance.manage": { module: "Maintenance", description: "Log breakdowns, service and schedules" },
  "maintenance.rts": { module: "Maintenance", description: "Authorise return to service", sensitive: true },
  "scanner.status": { module: "Maintenance", description: "Change scanner availability status" },
  // Staff
  "staff.view": { module: "Staff", description: "View staff, roster and training" },
  "staff.manage": { module: "Staff", description: "Manage staff records, competencies and training" },
  "roster.manage": { module: "Staff", description: "Manage duty roster and attendance" },
  "leave.approve": { module: "Staff", description: "Approve or decline leave" },
  // Incidents & infection control
  "incidents.report": { module: "Incidents", description: "Report an incident" },
  "incidents.view": { module: "Incidents", description: "View all incidents (confidential)", sensitive: true },
  "incidents.manage": { module: "Incidents", description: "Investigate and close incidents", sensitive: true },
  "cleaning.record": { module: "Infection Control", description: "Record cleaning checklists" },
  "cleaning.verify": { module: "Infection Control", description: "Verify cleaning records" },
  "cleaning.view": { module: "Infection Control", description: "View cleaning compliance" },
  // Reporting
  "analytics.view": { module: "Analytics", description: "View performance analytics" },
  "reports.export": { module: "Analytics", description: "Export PDF / Excel reports", sensitive: true },
  // Administration
  "admin.users": { module: "Administration", description: "Manage user accounts", sensitive: true },
  "admin.roles": { module: "Administration", description: "Manage roles and permissions", sensitive: true },
  "admin.settings": { module: "Administration", description: "Manage system settings, scanners, exam types and integrations" },
  "admin.audit": { module: "Administration", description: "View audit logs", sensitive: true },
} as const satisfies Record<string, { module: string; description: string; sensitive?: boolean }>;

export type Permission = keyof typeof PERMISSIONS;
const ALL = Object.keys(PERMISSIONS) as Permission[];

export const ROLES: Record<string, { name: string; description: string; permissions: Permission[] }> = {
  SUPERVISOR: {
    name: "MRI Supervisor",
    description: "Full departmental oversight, approval and verification responsibilities.",
    permissions: ALL.filter((p) => !["admin.users", "admin.roles"].includes(p)),
  },
  RADIOGRAPHER: {
    name: "MRI Radiographer",
    description: "Patient workflow, safety screening, implant records, scanning and PACS tracking.",
    permissions: [
      "dashboard.command", "patients.view", "patients.manage", "appointments.view", "appointments.manage",
      "appointments.reminders", "arrival.record", "screening.view", "screening.record", "safety.clear.routine",
      "implants.view", "implants.manage", "documents.view_sensitive", "prep.manage", "protocols.view", "protocols.edit",
      "scanning.perform", "pacs.view", "pacs.manage", "pacs.verify", "contrast.view", "contrast.administer",
      "qc.view", "qc.record", "maintenance.view", "maintenance.manage", "staff.view", "incidents.report",
      "cleaning.record", "cleaning.view",
    ],
  },
  NURSE: {
    name: "MRI Nurse",
    description: "Patient preparation, cannulation, contrast administration and patient care records.",
    permissions: [
      "dashboard.command", "patients.view", "appointments.view", "arrival.record", "screening.view",
      "implants.view", "prep.manage", "protocols.view", "contrast.view", "contrast.administer", "contrast.inventory",
      "staff.view", "incidents.report", "cleaning.record", "cleaning.view",
    ],
  },
  RECEPTIONIST: {
    name: "Receptionist",
    description: "Appointments, patient registration and arrival recording.",
    permissions: [
      "patients.view", "patients.manage", "appointments.view", "appointments.manage", "appointments.reminders",
      "arrival.record", "incidents.report",
    ],
  },
  MANAGEMENT: {
    name: "Hospital Management",
    description: "Executive dashboards and authorised operational reports (aggregate data).",
    permissions: ["dashboard.executive", "analytics.view", "reports.export", "incidents.report", "staff.view", "maintenance.view", "qc.view", "cleaning.view"],
  },
  SYSADMIN: {
    name: "System Administrator",
    description: "Technical configuration, user accounts, roles and permissions. No clinical access by default.",
    permissions: ["admin.users", "admin.roles", "admin.settings", "admin.audit", "incidents.report"],
  },
  MR_SAFETY: {
    name: "Authorised MR Safety Personnel",
    description: "Implant verification, MR safety assessment and authorised safety decisions.",
    permissions: [
      "dashboard.command", "patients.view", "appointments.view", "screening.view", "screening.record",
      "safety.clear.routine", "safety.clear", "implants.view", "implants.manage", "implants.verify", "implants.assess",
      "implants.configure", "devices.verify", "documents.view_sensitive", "protocols.view", "scanning.perform",
      "pacs.view", "qc.view", "maintenance.view", "staff.view", "incidents.report", "incidents.view",
      "cleaning.view",
    ],
  },
};
