import { q } from "@/lib/db";

export const listScanners = (activeOnly = true) =>
  q(`SELECT * FROM scanners ${activeOnly ? "WHERE is_active" : ""} ORDER BY name`);
export const listExamTypes = (activeOnly = true) =>
  q(`SELECT e.*, p.name AS prep_name, p.status AS prep_status FROM exam_types e LEFT JOIN prep_protocols p ON p.id = e.prep_protocol_id ${activeOnly ? "WHERE e.is_active" : ""} ORDER BY e.name`);
export const listStaff = (filter: "all" | "radiographers" | "nurses" | "clinical" = "all") => {
  const where = { all: "", radiographers: "AND (designation ILIKE '%radiographer%' OR designation ILIKE '%supervisor%')", nurses: "AND designation ILIKE '%nurse%'",
    clinical: "AND (designation ILIKE '%radiographer%' OR designation ILIKE '%nurse%' OR designation ILIKE '%supervisor%' OR designation ILIKE '%safety%')" }[filter];
  return q(`SELECT id, full_name, designation, staff_no FROM staff WHERE employment_status NOT IN ('LEFT','SUSPENDED') ${where} ORDER BY full_name`);
};
export const listProtocols = () => q(`SELECT id, name, category, status, version FROM mri_protocols WHERE status IN ('APPROVED','DRAFT','PENDING_APPROVAL') AND kind='DEPARTMENTAL' ORDER BY category, name`);
export const listImplantCategories = () => q(`SELECT * FROM implant_categories WHERE is_active ORDER BY group_name, name`);

/** Appointment rows with joined display data for list views. */
export const APPT_SELECT = `
  SELECT a.id, a.accession_no, a.status, a.screening_status, a.prep_status, a.priority, a.contrast, a.patient_type, a.body_region,
         a.scheduled_start, a.scheduled_end, a.arrived_at, a.completed_at, a.reminder_at, a.is_demo, a.referring_department, a.referring_doctor,
         a.clinical_indication, a.notes, a.cancel_reason,
         p.id AS patient_id, p.full_name, p.mrn, p.dob::text AS dob, p.sex, p.phone,
         e.name AS exam_name, e.code AS exam_code, s.id AS scanner_id, s.name AS scanner_name, s.colour AS scanner_colour,
         st.full_name AS radiographer_name, st.id AS radiographer_id,
         sr.started_at AS scan_started_at, sr.ended_at AS scan_ended_at, pu.status AS pacs_status, pu.id AS pacs_id, pu.verification_status AS pacs_verification,
         (SELECT count(*) FROM patient_implants pi WHERE pi.patient_id = p.id AND pi.is_present)::int AS implant_count
    FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN exam_types e ON e.id=a.exam_type_id JOIN scanners s ON s.id=a.scanner_id
    LEFT JOIN staff st ON st.id=a.radiographer_id LEFT JOIN scan_records sr ON sr.appointment_id=a.id LEFT JOIN pacs_uploads pu ON pu.appointment_id=a.id`;
