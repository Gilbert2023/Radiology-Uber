// Shared domain vocabulary (safe to import in client and server code).

export const APPOINTMENT_STATUSES = [
  "BOOKED", "ARRIVED", "SCREENING", "PREPARATION", "CLEARED", "SCANNING", "SCANNED",
  "COMPLETED", "INCOMPLETE", "CANCELLED", "NO_SHOW",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Seven-stage patient journey used for the stepper. */
export const JOURNEY_STAGES = [
  { key: "BOOKING", label: "Appointment", short: "Booked" },
  { key: "ARRIVAL", label: "Arrival", short: "Arrived" },
  { key: "SCREENING", label: "Safety screening", short: "Screening" },
  { key: "PREPARATION", label: "Preparation", short: "Prep" },
  { key: "SCANNING", label: "Scanning", short: "Scan" },
  { key: "PACS", label: "PACS upload", short: "PACS" },
  { key: "COMPLETION", label: "Completion", short: "Done" },
] as const;

/** Display status (calendar colour code) – derived from workflow status + timing. */
export type DisplayStatus =
  | "CONFIRMED" | "ARRIVED" | "WAITING" | "IN_PREPARATION" | "SAFETY_PENDING" | "NOT_CLEARED"
  | "CLEARED" | "SCANNING" | "PACS_PENDING" | "COMPLETED" | "INCOMPLETE" | "CANCELLED" | "NO_SHOW" | "DELAYED";

export const DISPLAY_STATUS: Record<DisplayStatus, { label: string; badge: string; card: string; dot: string }> = {
  CONFIRMED:      { label: "Confirmed",      badge: "bg-blue-50 text-blue-700 ring-blue-200",       card: "border-l-blue-500 bg-blue-50/70",       dot: "bg-blue-500" },
  ARRIVED:        { label: "Arrived",        badge: "bg-cyan-50 text-cyan-800 ring-cyan-200",       card: "border-l-cyan-500 bg-cyan-50/70",       dot: "bg-cyan-500" },
  WAITING:        { label: "Waiting",        badge: "bg-amber-50 text-amber-800 ring-amber-200",    card: "border-l-amber-500 bg-amber-50/70",     dot: "bg-amber-500" },
  SAFETY_PENDING: { label: "Safety pending", badge: "bg-orange-50 text-orange-800 ring-orange-200", card: "border-l-orange-500 bg-orange-50/70",   dot: "bg-orange-500" },
  NOT_CLEARED:    { label: "Not cleared",    badge: "bg-red-50 text-red-700 ring-red-200",          card: "border-l-red-600 bg-red-50/70",         dot: "bg-red-600" },
  IN_PREPARATION: { label: "In preparation", badge: "bg-violet-50 text-violet-700 ring-violet-200", card: "border-l-violet-500 bg-violet-50/70",   dot: "bg-violet-500" },
  CLEARED:        { label: "Cleared",        badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", card: "border-l-emerald-500 bg-emerald-50/70", dot: "bg-emerald-500" },
  SCANNING:       { label: "Scanning",       badge: "bg-indigo-50 text-indigo-700 ring-indigo-200", card: "border-l-indigo-600 bg-indigo-50/80",   dot: "bg-indigo-600" },
  PACS_PENDING:   { label: "Awaiting PACS",  badge: "bg-sky-50 text-sky-800 ring-sky-200",          card: "border-l-sky-600 bg-sky-50/70",         dot: "bg-sky-600" },
  COMPLETED:      { label: "Completed",      badge: "bg-green-100 text-green-800 ring-green-300",   card: "border-l-green-700 bg-green-50",        dot: "bg-green-700" },
  INCOMPLETE:     { label: "Incomplete",     badge: "bg-rose-50 text-rose-700 ring-rose-200",       card: "border-l-rose-600 bg-rose-50/70",       dot: "bg-rose-600" },
  CANCELLED:      { label: "Cancelled",      badge: "bg-slate-100 text-slate-600 ring-slate-300",   card: "border-l-slate-400 bg-slate-50 opacity-70", dot: "bg-slate-400" },
  NO_SHOW:        { label: "No-show",        badge: "bg-zinc-100 text-zinc-700 ring-zinc-300",      card: "border-l-zinc-500 bg-zinc-100 opacity-80", dot: "bg-zinc-500" },
  DELAYED:        { label: "Delayed",        badge: "bg-red-50 text-red-700 ring-red-200",          card: "border-l-red-500 bg-red-50/70",         dot: "bg-red-500" },
};

export const PRIORITIES = ["ROUTINE", "URGENT", "EMERGENCY"] as const;
export const PATIENT_TYPES = ["OUTPATIENT", "INPATIENT", "EMERGENCY"] as const;
export const SEXES = ["MALE", "FEMALE", "OTHER", "UNKNOWN"] as const;

export const BODY_REGIONS: Record<string, string> = {
  BRAIN: "Brain", HEAD_NECK: "Head & neck", SPINE: "Spine", MSK: "Musculoskeletal", ABDOMEN: "Abdomen",
  PELVIS: "Pelvis", CARDIAC: "Cardiac", VASCULAR: "Vascular (MRA/MRV)", BREAST: "Breast", CHEST: "Chest",
  WHOLE_BODY: "Whole body", OTHER: "Other",
};

export const SCANNER_STATUS: Record<string, { label: string; badge: string }> = {
  AVAILABLE: { label: "Available", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  IN_USE: { label: "In use", badge: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  MAINTENANCE: { label: "Under maintenance", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  UNAVAILABLE: { label: "Unavailable", badge: "bg-red-50 text-red-700 ring-red-200" },
};

export const PACS_STATUS: Record<string, { label: string; badge: string }> = {
  PENDING_UPLOAD: { label: "Pending upload", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  UPLOADING: { label: "Uploading", badge: "bg-sky-50 text-sky-800 ring-sky-200" },
  SUCCESSFULLY_UPLOADED: { label: "Successfully uploaded", badge: "bg-green-100 text-green-800 ring-green-300" },
  UPLOAD_FAILED: { label: "Upload failed", badge: "bg-red-50 text-red-700 ring-red-200" },
  REQUIRES_INVESTIGATION: { label: "Requires investigation", badge: "bg-rose-50 text-rose-700 ring-rose-300" },
};

export const PACS_TRANSITIONS: Record<string, string[]> = {
  PENDING_UPLOAD: ["UPLOADING", "SUCCESSFULLY_UPLOADED", "UPLOAD_FAILED", "REQUIRES_INVESTIGATION"],
  UPLOADING: ["SUCCESSFULLY_UPLOADED", "UPLOAD_FAILED", "REQUIRES_INVESTIGATION"],
  UPLOAD_FAILED: ["UPLOADING", "PENDING_UPLOAD", "SUCCESSFULLY_UPLOADED", "REQUIRES_INVESTIGATION"],
  REQUIRES_INVESTIGATION: ["UPLOADING", "PENDING_UPLOAD", "SUCCESSFULLY_UPLOADED", "UPLOAD_FAILED"],
  SUCCESSFULLY_UPLOADED: ["REQUIRES_INVESTIGATION"],
};

// ---------------------------------------------------------------------------
// MRI safety screening questionnaire
// hazard  -> a YES/UNSURE answer needs authorised MR safety review (not routine clearance)
// implant -> a YES/UNSURE answer requires an implant/device record and exam-specific assessment
// ---------------------------------------------------------------------------
export const SCREENING_QUESTIONS = [
  { key: "pacemaker", label: "Cardiac pacemaker (or pacing wires)", hazard: true, implant: true },
  { key: "icd", label: "Implantable cardioverter defibrillator (ICD)", hazard: true, implant: true },
  { key: "cochlear", label: "Cochlear implant / implanted hearing device", hazard: true, implant: true },
  { key: "neurostimulator", label: "Neurostimulator (DBS, spinal cord, vagal or other)", hazard: true, implant: true },
  { key: "aneurysm_clip", label: "Aneurysm clip(s)", hazard: true, implant: true },
  { key: "stent", label: "Vascular stent, coil, filter or graft", hazard: true, implant: true },
  { key: "surgical_implant", label: "Other surgical implant, clip, staple, shunt or pump", hazard: true, implant: true },
  { key: "ortho_implant", label: "Orthopaedic implant (joint, plate, screw, rod, nail)", hazard: true, implant: true },
  { key: "metal_fb", label: "Metallic foreign body (shrapnel, bullet, metal fragments)", hazard: true, implant: true },
  { key: "eye_metal", label: "Previous eye injury involving metal", hazard: true, implant: false },
  { key: "previous_surgery", label: "Previous surgery (any)", hazard: true, implant: false },
  { key: "claustrophobia", label: "Claustrophobia / anxiety in enclosed spaces", hazard: false, implant: false },
  { key: "previous_mri", label: "Previous MRI examination", hazard: false, implant: false },
  { key: "other_concern", label: "Other MRI safety concern (patches, tattoos, body piercing, medication pump, etc.)", hazard: true, implant: false },
] as const;
export type ScreeningAnswer = "YES" | "NO" | "UNSURE";

export const SCREENING_STATUS: Record<string, { label: string; badge: string }> = {
  NOT_STARTED: { label: "Not started", badge: "bg-slate-100 text-slate-600 ring-slate-300" },
  PENDING: { label: "Pending", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  CLEAR: { label: "Clear", badge: "bg-green-100 text-green-800 ring-green-300" },
  NOT_CLEARED: { label: "Not cleared", badge: "bg-red-50 text-red-700 ring-red-300" },
};

export const PREP_STATUS: Record<string, { label: string; badge: string }> = {
  NOT_STARTED: { label: "Not started", badge: "bg-slate-100 text-slate-600 ring-slate-300" },
  IN_PROGRESS: { label: "In progress", badge: "bg-violet-50 text-violet-700 ring-violet-200" },
  COMPLETE: { label: "Complete", badge: "bg-green-100 text-green-800 ring-green-300" },
};

// ---------------------------------------------------------------------------
// Implant registry vocabulary
// ---------------------------------------------------------------------------
export const IMPLANT_MATERIALS: Record<string, string> = {
  TITANIUM: "Titanium", TITANIUM_ALLOY: "Titanium alloy", STAINLESS_STEEL: "Stainless steel",
  COBALT_CHROMIUM: "Cobalt-chromium", PLATINUM: "Platinum", GOLD: "Gold", NICKEL_ALLOY: "Nickel-containing alloy",
  NITINOL: "Nitinol", CERAMIC: "Ceramic", POLYMER: "Polymer", SILICONE: "Silicone", CARBON: "Carbon-based",
  OTHER: "Other", UNKNOWN: "Unknown / not documented",
};

export const SAFETY_CLASS: Record<string, { label: string; badge: string; short: string }> = {
  MR_SAFE: { label: "MR Safe", short: "Safe", badge: "bg-green-100 text-green-800 ring-green-300" },
  MR_CONDITIONAL: { label: "MR Conditional", short: "Conditional", badge: "bg-amber-50 text-amber-800 ring-amber-300" },
  MR_UNSAFE: { label: "MR Unsafe", short: "Unsafe", badge: "bg-red-100 text-red-800 ring-red-300" },
  UNKNOWN: { label: "Unknown / not verified", short: "Unknown", badge: "bg-slate-200 text-slate-700 ring-slate-400" },
};

export const VERIFICATION_STATUS: Record<string, { label: string; badge: string }> = {
  NOT_STARTED: { label: "Not started", badge: "bg-slate-100 text-slate-600 ring-slate-300" },
  PENDING_DOCUMENTATION: { label: "Pending documentation", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  UNDER_REVIEW: { label: "Under review", badge: "bg-sky-50 text-sky-800 ring-sky-200" },
  VERIFIED: { label: "Verified", badge: "bg-green-100 text-green-800 ring-green-300" },
  ESCALATED: { label: "Escalated for MR safety review", badge: "bg-orange-50 text-orange-800 ring-orange-300" },
  UNSUCCESSFUL: { label: "Verification unsuccessful", badge: "bg-red-50 text-red-700 ring-red-300" },
};

export const VERIFICATION_CHECKLIST = [
  { key: "identity_confirmed", label: "Implant identity confirmed" },
  { key: "manufacturer_docs_reviewed", label: "Manufacturer documentation reviewed" },
  { key: "implant_card", label: "Implant card available" },
  { key: "operative_notes", label: "Operative notes available" },
  { key: "model_serial_confirmed", label: "Model and serial number confirmed" },
  { key: "safety_docs_reviewed", label: "MR safety documentation reviewed" },
  { key: "restrictions_checked", label: "Restrictions / conditions checked" },
  { key: "specialist_consulted", label: "Specialist consultation (where required)" },
] as const;

/** Fields captured for MR Conditional devices – exactly as stated by the manufacturer. */
export const CONDITION_FIELDS = [
  { key: "field_strength", label: "Permitted static field strength(s)", hint: "e.g. as worded in labelling – 1.5 T only" },
  { key: "spatial_gradient", label: "Max spatial field gradient", hint: "Value and units exactly as labelled" },
  { key: "slew_rate", label: "Gradient slew rate limit", hint: "Where specified" },
  { key: "sar_whole_body", label: "Whole-body SAR limit", hint: "" },
  { key: "sar_head", label: "Head SAR limit", hint: "" },
  { key: "b1rms", label: "B1+rms limit", hint: "Where applicable" },
  { key: "scan_duration", label: "Scan duration / active scan time limit", hint: "" },
  { key: "waiting_period", label: "Waiting period after implantation", hint: "" },
  { key: "coil_config", label: "Coil configuration (transmit/receive)", hint: "" },
  { key: "positioning", label: "Patient positioning / isocentre restrictions", hint: "" },
  { key: "anatomical_region", label: "Permitted anatomical region / exclusion zones", hint: "" },
  { key: "device_programming", label: "Device programming / MRI mode", hint: "" },
  { key: "monitoring", label: "Monitoring requirements", hint: "" },
  { key: "manufacturer_instructions", label: "Manufacturer instructions (reference)", hint: "" },
  { key: "other_restrictions", label: "Other restrictions", hint: "" },
] as const;

export const ASSESSMENT_DECISION: Record<string, { label: string; badge: string }> = {
  PENDING: { label: "Pending assessment", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  PROCEED: { label: "Proceed", badge: "bg-green-100 text-green-800 ring-green-300" },
  PROCEED_WITH_CONDITIONS: { label: "Proceed with conditions", badge: "bg-emerald-50 text-emerald-800 ring-emerald-300" },
  DO_NOT_SCAN: { label: "Do not scan", badge: "bg-red-100 text-red-800 ring-red-300" },
  DEFER_SPECIALIST: { label: "Defer – specialist review", badge: "bg-orange-50 text-orange-800 ring-orange-300" },
};

export const SIDES = ["RIGHT", "LEFT", "BILATERAL", "MIDLINE", "NOT_APPLICABLE", "UNKNOWN"] as const;

export const PROTOCOL_CATEGORIES: Record<string, string> = {
  BRAIN: "Brain", SPINE: "Spine", MSK: "Musculoskeletal", ABDOMEN: "Abdomen", PELVIS: "Pelvis",
  CARDIAC: "Cardiac", MRA: "MRA", MRV: "MRV", SPECIAL: "Special examinations",
};

export const PROTOCOL_STATUS: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: "Draft", badge: "bg-slate-100 text-slate-700 ring-slate-300" },
  PENDING_APPROVAL: { label: "Pending approval", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  APPROVED: { label: "Approved", badge: "bg-green-100 text-green-800 ring-green-300" },
  SUPERSEDED: { label: "Superseded", badge: "bg-zinc-100 text-zinc-600 ring-zinc-300" },
  ARCHIVED: { label: "Archived", badge: "bg-zinc-100 text-zinc-500 ring-zinc-300" },
};

export const INCIDENT_CATEGORIES: Record<string, string> = {
  PATIENT: "Patient incident", CONTRAST_REACTION: "Contrast reaction", EXTRAVASATION: "Extravasation",
  PROJECTILE: "Projectile incident", MRI_BURN: "MRI burn", FALL: "Fall", NEAR_MISS: "Near miss",
  EQUIPMENT_FAILURE: "Equipment failure", MRI_SAFETY: "MRI safety concern", OTHER: "Other departmental incident",
};
export const INCIDENT_SEVERITY: Record<string, { label: string; badge: string }> = {
  NO_HARM: { label: "No harm", badge: "bg-slate-100 text-slate-700 ring-slate-300" },
  LOW: { label: "Low", badge: "bg-sky-50 text-sky-800 ring-sky-200" },
  MODERATE: { label: "Moderate", badge: "bg-amber-50 text-amber-800 ring-amber-300" },
  SEVERE: { label: "Severe", badge: "bg-orange-100 text-orange-800 ring-orange-300" },
  CRITICAL: { label: "Critical", badge: "bg-red-100 text-red-800 ring-red-300" },
};
export const INCIDENT_STATUS: Record<string, { label: string; badge: string }> = {
  OPEN: { label: "Open", badge: "bg-red-50 text-red-700 ring-red-200" },
  UNDER_INVESTIGATION: { label: "Under investigation", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  ACTION_PLANNED: { label: "CAPA planned", badge: "bg-sky-50 text-sky-800 ring-sky-200" },
  CLOSED: { label: "Closed", badge: "bg-green-100 text-green-800 ring-green-300" },
};

export const SHIFTS: Record<string, { label: string; time: string; badge: string }> = {
  MORNING: { label: "Morning", time: "07:30–14:00", badge: "bg-sky-50 text-sky-800 ring-sky-200" },
  AFTERNOON: { label: "Afternoon", time: "14:00–20:00", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  NIGHT: { label: "Night", time: "20:00–07:30", badge: "bg-indigo-50 text-indigo-800 ring-indigo-200" },
  ON_CALL: { label: "On-call", time: "As required", badge: "bg-violet-50 text-violet-800 ring-violet-200" },
};

export const INTEGRATION_STATUS: Record<string, { label: string; badge: string }> = {
  NOT_CONNECTED: { label: "Not connected", badge: "bg-slate-100 text-slate-700 ring-slate-300" },
  CONFIGURED: { label: "Configured", badge: "bg-sky-50 text-sky-800 ring-sky-200" },
  CONNECTED: { label: "Connected", badge: "bg-green-100 text-green-800 ring-green-300" },
  FAILED: { label: "Failed", badge: "bg-red-50 text-red-700 ring-red-200" },
  UNDER_DEVELOPMENT: { label: "Under development", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
};

export function labelize(v: string | null | undefined): string {
  if (!v) return "—";
  return v.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
