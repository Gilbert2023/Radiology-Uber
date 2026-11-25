-- =====================================================================
-- The Bank Hospital – MRI Suite Management System
-- Migration 001: core relational schema
-- All timestamps are timestamptz (stored UTC); departmental display uses
-- the configured time zone (default Africa/Accra).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------
-- Organisation & configuration
-- ---------------------------------------------------------------------
CREATE TABLE hospitals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  department   text NOT NULL DEFAULT 'Radiology Department – MRI Unit',
  country      text NOT NULL DEFAULT 'Ghana',
  timezone     text NOT NULL DEFAULT 'Africa/Accra',
  currency     text NOT NULL DEFAULT 'GHS',
  address      text,
  phone        text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE settings (
  key          text PRIMARY KEY,
  value        jsonb NOT NULL,
  description  text,
  updated_by   uuid,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Identity, roles & permissions
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text,
  is_system    boolean NOT NULL DEFAULT true
);

CREATE TABLE permissions (
  code         text PRIMARY KEY,
  module       text NOT NULL,
  description  text NOT NULL,
  is_sensitive boolean NOT NULL DEFAULT false
);

CREATE TABLE role_permissions (
  role_id         uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE staff (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id          uuid NOT NULL REFERENCES hospitals(id),
  staff_no             text NOT NULL UNIQUE,
  full_name            text NOT NULL,
  designation          text NOT NULL,
  phone                text,
  email                citext,
  employment_status    text NOT NULL DEFAULT 'ACTIVE'
                       CHECK (employment_status IN ('ACTIVE','PART_TIME','LOCUM','ON_LEAVE','SUSPENDED','LEFT')),
  registration_body    text,
  registration_no      text,
  registration_expiry  date,
  contracted_hours_week numeric(5,1) NOT NULL DEFAULT 40,
  is_demo              boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username              citext NOT NULL UNIQUE,
  email                 citext UNIQUE,
  full_name             text NOT NULL,
  password_hash         text NOT NULL,
  role_id               uuid NOT NULL REFERENCES roles(id),
  staff_id              uuid UNIQUE REFERENCES staff(id) ON DELETE SET NULL,
  is_active             boolean NOT NULL DEFAULT true,
  must_change_password  boolean NOT NULL DEFAULT false,
  failed_logins         int NOT NULL DEFAULT 0,
  locked_until          timestamptz,
  last_login_at         timestamptz,
  password_changed_at   timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX users_role_idx ON users(role_id);

CREATE TABLE sessions (
  id            text PRIMARY KEY,            -- SHA-256 of the opaque cookie token
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  ip            text,
  user_agent    text
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE password_reset_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  issued_by   uuid REFERENCES users(id),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  username    text,
  action      text NOT NULL,
  entity      text,
  entity_id   text,
  details     jsonb,
  ip          text
);
CREATE INDEX audit_at_idx ON audit_logs(at DESC);
CREATE INDEX audit_entity_idx ON audit_logs(entity, entity_id);
CREATE INDEX audit_user_idx ON audit_logs(user_id);

-- Audit log is append-only.
CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

CREATE TABLE integrations (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'NOT_CONNECTED'
              CHECK (status IN ('NOT_CONNECTED','CONFIGURED','CONNECTED','FAILED','UNDER_DEVELOPMENT')),
  endpoint    text,
  notes       text,
  updated_by  uuid REFERENCES users(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Scanners & examination catalogue
-- ---------------------------------------------------------------------
CREATE TABLE scanners (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       uuid NOT NULL REFERENCES hospitals(id),
  name              text NOT NULL,
  manufacturer      text NOT NULL,
  model             text NOT NULL,
  field_strength_t  numeric(3,1) NOT NULL,
  serial_no         text,
  installed_on      date,
  installation_notes text,
  location          text,
  service_provider  text,
  status            text NOT NULL DEFAULT 'AVAILABLE'
                    CHECK (status IN ('AVAILABLE','IN_USE','MAINTENANCE','UNAVAILABLE')),
  status_note       text,
  is_active         boolean NOT NULL DEFAULT true,
  colour            text NOT NULL DEFAULT '#1f3f7a',
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, name)
);

CREATE TABLE prep_protocols (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  exam_category      text NOT NULL,
  fasting_hours      numeric(4,1),
  requires_egfr      boolean NOT NULL DEFAULT false,
  oral_contrast      boolean NOT NULL DEFAULT false,
  iv_cannula         boolean NOT NULL DEFAULT false,
  medication_notes   text,
  instructions       text,
  checklist          jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array of {key,label}
  status             text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','ARCHIVED')),
  version            int NOT NULL DEFAULT 1,
  approved_by        uuid REFERENCES users(id),
  approved_at        timestamptz,
  updated_by         uuid REFERENCES users(id),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exam_types (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text NOT NULL UNIQUE,
  name                  text NOT NULL,
  body_region           text NOT NULL CHECK (body_region IN
                        ('BRAIN','HEAD_NECK','SPINE','MSK','ABDOMEN','PELVIS','CARDIAC','VASCULAR','BREAST','CHEST','WHOLE_BODY','OTHER')),
  default_duration_min  int NOT NULL CHECK (default_duration_min BETWEEN 5 AND 240),
  contrast_default      boolean NOT NULL DEFAULT false,
  prep_protocol_id      uuid REFERENCES prep_protocols(id),
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Patients & appointments (the patient journey)
-- ---------------------------------------------------------------------
CREATE TABLE patients (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id    uuid NOT NULL REFERENCES hospitals(id),
  mrn            citext NOT NULL,
  full_name      text NOT NULL,
  dob            date NOT NULL,
  sex            text NOT NULL CHECK (sex IN ('MALE','FEMALE','OTHER','UNKNOWN')),
  phone          text,
  email          citext,
  address        text,
  next_of_kin    text,
  next_of_kin_phone text,
  weight_kg      numeric(5,1),
  is_demo        boolean NOT NULL DEFAULT false,
  created_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, mrn)
);
CREATE INDEX patients_name_idx ON patients (lower(full_name));
CREATE INDEX patients_dob_idx ON patients (dob);

CREATE TABLE appointments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id          uuid NOT NULL REFERENCES hospitals(id),
  accession_no         text NOT NULL UNIQUE,
  patient_id           uuid NOT NULL REFERENCES patients(id),
  exam_type_id         uuid NOT NULL REFERENCES exam_types(id),
  body_region          text NOT NULL,
  clinical_indication  text NOT NULL,
  referring_doctor     text NOT NULL,
  referring_department text NOT NULL,
  patient_type         text NOT NULL DEFAULT 'OUTPATIENT' CHECK (patient_type IN ('OUTPATIENT','INPATIENT','EMERGENCY')),
  contrast             boolean NOT NULL DEFAULT false,
  priority             text NOT NULL DEFAULT 'ROUTINE' CHECK (priority IN ('ROUTINE','URGENT','EMERGENCY')),
  preferred_date       date,
  scheduled_start      timestamptz NOT NULL,
  scheduled_end        timestamptz NOT NULL,
  scanner_id           uuid NOT NULL REFERENCES scanners(id),
  radiographer_id      uuid REFERENCES staff(id),
  notes                text,
  status               text NOT NULL DEFAULT 'BOOKED' CHECK (status IN
                       ('BOOKED','ARRIVED','SCREENING','PREPARATION','CLEARED','SCANNING','SCANNED','COMPLETED','INCOMPLETE','CANCELLED','NO_SHOW')),
  screening_status     text NOT NULL DEFAULT 'NOT_STARTED' CHECK (screening_status IN ('NOT_STARTED','PENDING','CLEAR','NOT_CLEARED')),
  prep_status          text NOT NULL DEFAULT 'NOT_STARTED' CHECK (prep_status IN ('NOT_STARTED','IN_PROGRESS','COMPLETE')),
  arrived_at           timestamptz,
  arrival_received_by  uuid REFERENCES users(id),
  identity_verified    boolean NOT NULL DEFAULT false,
  identity_method      text,
  completed_at         timestamptz,
  cancelled_at         timestamptz,
  cancel_reason        text,
  no_show_at           timestamptz,
  reminder_at          timestamptz,
  reminder_by          uuid REFERENCES users(id),
  reminder_note        text,
  reschedule_count     int NOT NULL DEFAULT 0,
  is_demo              boolean NOT NULL DEFAULT false,
  booked_by            uuid REFERENCES users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (scheduled_end > scheduled_start)
);
CREATE INDEX appt_start_idx ON appointments (scheduled_start);
CREATE INDEX appt_scanner_start_idx ON appointments (scanner_id, scheduled_start);
CREATE INDEX appt_patient_idx ON appointments (patient_id);
CREATE INDEX appt_status_idx ON appointments (status);

-- Hard guarantee against double-booking a scanner (active appointments only).
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE appointments ADD CONSTRAINT appt_no_scanner_overlap
  EXCLUDE USING gist (
    scanner_id WITH =,
    tstzrange(scheduled_start, scheduled_end, '[)') WITH &&
  ) WHERE (status NOT IN ('CANCELLED','NO_SHOW'));

CREATE TABLE workflow_events (
  id              bigserial PRIMARY KEY,
  appointment_id  uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  from_status     text,
  to_status       text NOT NULL,
  event           text NOT NULL,
  note            text,
  user_id         uuid REFERENCES users(id),
  at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wf_appt_idx ON workflow_events (appointment_id, at);

-- ---------------------------------------------------------------------
-- MRI safety screening
-- ---------------------------------------------------------------------
CREATE TABLE safety_screenings (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id            uuid NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id                uuid NOT NULL REFERENCES patients(id),
  answers                   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {questionKey:{answer:'YES'|'NO'|'UNSURE', details}}
  pregnancy_status          text CHECK (pregnancy_status IN ('NOT_APPLICABLE','NOT_PREGNANT','POSSIBLY_PREGNANT','PREGNANT','UNKNOWN')),
  weight_kg                 numeric(5,1),
  additional_investigation  text,
  notes                     text,
  status                    text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CLEAR','NOT_CLEARED')),
  screened_by               uuid REFERENCES users(id),
  screened_at               timestamptz,
  decision_by               uuid REFERENCES users(id),
  decision_at               timestamptz,
  decision_notes            text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Implant & medical device registry
-- ---------------------------------------------------------------------
CREATE TABLE implant_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name  text NOT NULL,
  name        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES users(id),
  UNIQUE (group_name, name)
);

CREATE TABLE device_references (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id              uuid NOT NULL REFERENCES implant_categories(id),
  manufacturer             text NOT NULL,
  model_name               text NOT NULL,
  model_number             text,
  materials                text[] NOT NULL DEFAULT '{UNKNOWN}',
  material_details         text,
  safety_class             text NOT NULL DEFAULT 'UNKNOWN' CHECK (safety_class IN ('MR_SAFE','MR_CONDITIONAL','MR_UNSAFE','UNKNOWN')),
  approved_field_strengths text,
  conditions               jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_type              text,
  source_title             text,
  source_revision          text,
  source_reference         text,
  info_status              text NOT NULL DEFAULT 'USER_ENTERED_UNVERIFIED'
                           CHECK (info_status IN ('MANUFACTURER_VERIFIED','USER_ENTERED_UNVERIFIED')),
  last_verified_at         timestamptz,
  verified_by              uuid REFERENCES users(id),
  version                  int NOT NULL DEFAULT 1,
  is_demo                  boolean NOT NULL DEFAULT false,
  created_by               uuid REFERENCES users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX devref_search_idx ON device_references (lower(manufacturer), lower(model_name));

CREATE TABLE device_reference_versions (
  id                   bigserial PRIMARY KEY,
  device_reference_id  uuid NOT NULL REFERENCES device_references(id) ON DELETE CASCADE,
  version              int NOT NULL,
  snapshot             jsonb NOT NULL,
  changed_by           uuid REFERENCES users(id),
  changed_at           timestamptz NOT NULL DEFAULT now(),
  change_note          text
);

CREATE TABLE patient_implants (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id           uuid NOT NULL REFERENCES patients(id),
  device_reference_id  uuid REFERENCES device_references(id),
  category_id          uuid NOT NULL REFERENCES implant_categories(id),
  device_name          text NOT NULL,
  anatomical_location  text,
  side                 text CHECK (side IN ('RIGHT','LEFT','BILATERAL','MIDLINE','NOT_APPLICABLE','UNKNOWN')),
  manufacturer         text,
  model_name           text,
  model_number         text,
  serial_no            text,
  catalogue_no         text,
  implanted_on         date,
  implanted_on_text    text,                 -- for partial / approximate dates as documented
  facility             text,
  implanting_specialist text,
  reason               text,
  materials            text[] NOT NULL DEFAULT '{UNKNOWN}',
  material_details     text,
  safety_class         text NOT NULL DEFAULT 'UNKNOWN' CHECK (safety_class IN ('MR_SAFE','MR_CONDITIONAL','MR_UNSAFE','UNKNOWN')),
  conditions           jsonb NOT NULL DEFAULT '{}'::jsonb,
  info_source          text NOT NULL DEFAULT 'USER_ENTERED_UNVERIFIED'
                       CHECK (info_source IN ('MANUFACTURER_VERIFIED','USER_ENTERED_UNVERIFIED')),
  verification_status  text NOT NULL DEFAULT 'NOT_STARTED' CHECK (verification_status IN
                       ('NOT_STARTED','PENDING_DOCUMENTATION','UNDER_REVIEW','VERIFIED','ESCALATED','UNSUCCESSFUL')),
  is_present           boolean NOT NULL DEFAULT true,  -- false once explanted (kept for history)
  notes                text,
  is_demo              boolean NOT NULL DEFAULT false,
  created_by           uuid REFERENCES users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pimpl_patient_idx ON patient_implants (patient_id);
CREATE INDEX pimpl_status_idx ON patient_implants (verification_status);

CREATE TABLE implant_verifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  implant_id         uuid NOT NULL REFERENCES patient_implants(id) ON DELETE CASCADE,
  checklist          jsonb NOT NULL DEFAULT '{}'::jsonb,
  doc_source         text,
  doc_title          text,
  doc_revision       text,
  doc_reference      text,
  status             text NOT NULL CHECK (status IN
                     ('NOT_STARTED','PENDING_DOCUMENTATION','UNDER_REVIEW','VERIFIED','ESCALATED','UNSUCCESSFUL')),
  specialist_consulted text,
  notes              text,
  verified_by        uuid REFERENCES users(id),
  verified_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX implver_implant_idx ON implant_verifications (implant_id, verified_at DESC);

-- Exam-specific MR safety assessment of an implant. A previous assessment is NEVER
-- reused: each appointment requires its own assessment.
CREATE TABLE implant_assessments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  implant_id         uuid NOT NULL REFERENCES patient_implants(id) ON DELETE CASCADE,
  appointment_id     uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  scanner_id         uuid REFERENCES scanners(id),
  conditions_compared boolean NOT NULL DEFAULT false,
  comparison         jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision           text NOT NULL DEFAULT 'PENDING' CHECK (decision IN
                     ('PENDING','PROCEED','PROCEED_WITH_CONDITIONS','DO_NOT_SCAN','DEFER_SPECIALIST')),
  conditions_applied text,
  notes              text,
  assessed_by        uuid REFERENCES users(id),
  assessed_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (implant_id, appointment_id)
);

CREATE TABLE documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type     text NOT NULL CHECK (owner_type IN ('IMPLANT','PATIENT','SCREENING','INCIDENT','MAINTENANCE','DEVICE_REFERENCE')),
  owner_id       uuid NOT NULL,
  doc_type       text NOT NULL,
  title          text,
  original_name  text NOT NULL,
  stored_name    text NOT NULL UNIQUE,
  mime_type      text NOT NULL,
  size_bytes     int NOT NULL,
  sha256         text NOT NULL,
  is_sensitive   boolean NOT NULL DEFAULT true,
  uploaded_by    uuid REFERENCES users(id),
  uploaded_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_owner_idx ON documents (owner_type, owner_id);

-- ---------------------------------------------------------------------
-- Preparation, protocols, scanning & PACS
-- ---------------------------------------------------------------------
CREATE TABLE patient_preparations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id         uuid NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  prep_protocol_id       uuid REFERENCES prep_protocols(id),
  checklist              jsonb NOT NULL DEFAULT '{}'::jsonb,
  fasting_confirmed      boolean,
  fasting_since          timestamptz,
  egfr_value             numeric(6,1),
  egfr_date              date,
  previous_imaging       text,
  medication_notes       text,
  oral_contrast_given    boolean,
  oral_contrast_details  text,
  iv_cannula             boolean,
  cannula_gauge          text,
  cannula_site           text,
  cannulated_by          uuid REFERENCES staff(id),
  metal_removed          boolean,
  gown_changed           boolean,
  special_considerations text,
  status                 text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','COMPLETE')),
  completed_by           uuid REFERENCES users(id),
  completed_at           timestamptz,
  updated_by             uuid REFERENCES users(id),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mri_protocols (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lineage_id           uuid NOT NULL,                     -- groups versions of the same protocol
  version              int NOT NULL DEFAULT 1,
  scanner_model        text NOT NULL,
  category             text NOT NULL CHECK (category IN ('BRAIN','SPINE','MSK','ABDOMEN','PELVIS','CARDIAC','MRA','MRV','SPECIAL')),
  name                 text NOT NULL,
  kind                 text NOT NULL DEFAULT 'DEPARTMENTAL' CHECK (kind IN ('DEPARTMENTAL','EDUCATIONAL_REFERENCE')),
  clinical_indication  text,
  positioning          text,
  coil                 text,
  contrast_requirement text,
  special_instructions text,
  status               text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','SUPERSEDED','ARCHIVED')),
  change_note          text,
  created_by           uuid REFERENCES users(id),
  approved_by          uuid REFERENCES users(id),
  approved_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lineage_id, version)
);

CREATE TABLE protocol_sequences (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id      uuid NOT NULL REFERENCES mri_protocols(id) ON DELETE CASCADE,
  seq_order        int NOT NULL,
  name             text NOT NULL,
  plane            text,
  tr               text, te text, ti text, flip_angle text,
  slice_thickness  text, fov text, matrix text, nex text,
  bandwidth        text, etl text, parallel_imaging text,
  notes            text
);
CREATE INDEX protseq_idx ON protocol_sequences (protocol_id, seq_order);

CREATE TABLE scan_records (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id          uuid NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  scanner_id              uuid NOT NULL REFERENCES scanners(id),
  radiographer_id         uuid NOT NULL REFERENCES staff(id),
  protocol_id             uuid REFERENCES mri_protocols(id),
  started_at              timestamptz NOT NULL,
  ended_at                timestamptz,
  contrast_used           boolean NOT NULL DEFAULT false,
  additional_sequences    text,
  protocol_modifications  text,
  repeat_sequences        int NOT NULL DEFAULT 0,
  completion_status       text CHECK (completion_status IN ('COMPLETE','INCOMPLETE')),
  incomplete_reason       text,
  notes                   text,
  started_by              uuid REFERENCES users(id),
  ended_by                uuid REFERENCES users(id),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX scan_started_idx ON scan_records (started_at);

CREATE TABLE pacs_uploads (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id       uuid NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  scan_record_id       uuid NOT NULL REFERENCES scan_records(id) ON DELETE CASCADE,
  method               text NOT NULL DEFAULT 'MANUAL_CONFIRMATION' CHECK (method IN ('MANUAL_CONFIRMATION','DICOM_INTEGRATION')),
  status               text NOT NULL DEFAULT 'PENDING_UPLOAD' CHECK (status IN
                       ('PENDING_UPLOAD','UPLOADING','SUCCESSFULLY_UPLOADED','UPLOAD_FAILED','REQUIRES_INVESTIGATION')),
  initiated_at         timestamptz,
  completed_at         timestamptz,
  image_count          int,
  series_count         int,
  failure_reason       text,
  corrective_action    text,
  verification_status  text NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','VERIFIED')),
  confirmed_by         uuid REFERENCES users(id),
  confirmed_at         timestamptz,
  attempts             int NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pacs_status_idx ON pacs_uploads (status);

CREATE TABLE pacs_upload_events (
  id           bigserial PRIMARY KEY,
  upload_id    uuid NOT NULL REFERENCES pacs_uploads(id) ON DELETE CASCADE,
  from_status  text,
  to_status    text NOT NULL,
  note         text,
  user_id      uuid REFERENCES users(id),
  at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Contrast media (clinical inventory – no financial data)
-- ---------------------------------------------------------------------
CREATE TABLE contrast_agents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  manufacturer    text NOT NULL,
  concentration   text NOT NULL,
  agent_type      text NOT NULL DEFAULT 'IV_GADOLINIUM' CHECK (agent_type IN ('IV_GADOLINIUM','ORAL','OTHER')),
  unit            text NOT NULL DEFAULT 'mL',
  reorder_level   numeric(10,1) NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contrast_batches (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id           uuid NOT NULL REFERENCES contrast_agents(id),
  batch_no           text NOT NULL,
  expiry_date        date NOT NULL,
  quantity_received  numeric(10,1) NOT NULL CHECK (quantity_received > 0),
  current_stock      numeric(10,1) NOT NULL CHECK (current_stock >= 0),
  supplier           text,
  received_on        date NOT NULL DEFAULT current_date,
  received_by        uuid REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, batch_no)
);

CREATE TABLE contrast_administrations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id         uuid NOT NULL REFERENCES appointments(id),
  patient_id             uuid NOT NULL REFERENCES patients(id),
  agent_id               uuid NOT NULL REFERENCES contrast_agents(id),
  batch_id               uuid NOT NULL REFERENCES contrast_batches(id),
  dose_ml                numeric(7,1) NOT NULL CHECK (dose_ml > 0),
  route                  text NOT NULL CHECK (route IN ('IV_HAND','IV_INJECTOR','ORAL','OTHER')),
  administered_at        timestamptz NOT NULL,
  administered_by        uuid NOT NULL REFERENCES staff(id),
  adverse_reaction       boolean NOT NULL DEFAULT false,
  reaction_severity      text CHECK (reaction_severity IN ('MILD','MODERATE','SEVERE')),
  reaction_details       text,
  extravasation          boolean NOT NULL DEFAULT false,
  extravasation_details  text,
  incident_id            uuid,
  recorded_by            uuid REFERENCES users(id),
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cadmin_at_idx ON contrast_administrations (administered_at);

CREATE TABLE contrast_stock_movements (
  id              bigserial PRIMARY KEY,
  batch_id        uuid NOT NULL REFERENCES contrast_batches(id),
  movement_type   text NOT NULL CHECK (movement_type IN ('RECEIPT','ADMINISTRATION','ADJUSTMENT','DISPOSAL')),
  quantity        numeric(10,1) NOT NULL,       -- signed: + in / - out
  reason          text,
  administration_id uuid REFERENCES contrast_administrations(id),
  user_id         uuid REFERENCES users(id),
  at              timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Equipment QC & maintenance
-- ---------------------------------------------------------------------
CREATE TABLE qc_parameters (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_id       uuid NOT NULL REFERENCES scanners(id),
  name             text NOT NULL,
  unit             text,
  frequency        text NOT NULL CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY','CUSTOM')),
  lower_limit      numeric,
  upper_limit      numeric,
  threshold_source text,         -- e.g. "GE service documentation rev X" – required before limits apply
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       int NOT NULL DEFAULT 0,
  UNIQUE (scanner_id, name, frequency)
);

CREATE TABLE qc_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_id         uuid NOT NULL REFERENCES scanners(id),
  frequency          text NOT NULL CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY','CUSTOM')),
  performed_at       timestamptz NOT NULL,
  performed_by       uuid NOT NULL REFERENCES staff(id),
  phantom            text,
  overall_result     text NOT NULL CHECK (overall_result IN ('PASS','FAIL','NOT_EVALUATED')),
  notes              text,
  corrective_action  text,
  verified_by        uuid REFERENCES users(id),
  verified_at        timestamptz,
  recorded_by        uuid REFERENCES users(id),
  is_demo            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qcs_at_idx ON qc_sessions (scanner_id, performed_at DESC);

CREATE TABLE qc_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES qc_sessions(id) ON DELETE CASCADE,
  parameter_id  uuid NOT NULL REFERENCES qc_parameters(id),
  value         numeric,
  observation   text,
  result        text NOT NULL CHECK (result IN ('PASS','FAIL','NOT_EVALUATED')),
  UNIQUE (session_id, parameter_id)
);

CREATE TABLE maintenance_schedules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_id       uuid NOT NULL REFERENCES scanners(id),
  title            text NOT NULL,
  frequency_days   int NOT NULL CHECK (frequency_days > 0),
  provider         text,
  last_done_on     date,
  next_due_on      date NOT NULL,
  is_active        boolean NOT NULL DEFAULT true
);

CREATE TABLE maintenance_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_id            uuid NOT NULL REFERENCES scanners(id),
  schedule_id           uuid REFERENCES maintenance_schedules(id),
  event_type            text NOT NULL CHECK (event_type IN ('PREVENTIVE','BREAKDOWN','REPAIR','INSPECTION','SOFTWARE_UPDATE')),
  reported_at           timestamptz NOT NULL,
  fault_description     text,
  engineer_name         text,
  engineer_company      text,
  engineer_contact      text,
  downtime_start        timestamptz,
  downtime_end          timestamptz,
  work_done             text,
  parts_replaced        text,
  status                text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','AWAITING_RTS','CLOSED')),
  rts_by                uuid REFERENCES users(id),
  rts_at                timestamptz,
  rts_notes             text,
  created_by            uuid REFERENCES users(id),
  is_demo               boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (downtime_end IS NULL OR downtime_start IS NULL OR downtime_end >= downtime_start)
);
CREATE INDEX maint_scanner_idx ON maintenance_events (scanner_id, reported_at DESC);

-- ---------------------------------------------------------------------
-- Staff & duty management
-- ---------------------------------------------------------------------
CREATE TABLE staff_competencies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  competency   text NOT NULL,
  level        text NOT NULL DEFAULT 'COMPETENT' CHECK (level IN ('TRAINING','SUPERVISED','COMPETENT','TRAINER')),
  achieved_on  date,
  expires_on   date,
  assessed_by  text,
  UNIQUE (staff_id, competency)
);

CREATE TABLE training_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  title         text NOT NULL,
  provider      text,
  category      text NOT NULL DEFAULT 'CPD' CHECK (category IN ('MANDATORY','MR_SAFETY','CPD','EQUIPMENT','OTHER')),
  completed_on  date NOT NULL,
  expires_on    date,
  hours         numeric(5,1),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leave_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  leave_type   text NOT NULL CHECK (leave_type IN ('ANNUAL','SICK','MATERNITY','PATERNITY','STUDY','COMPASSIONATE','OTHER')),
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  status       text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','DECLINED','CANCELLED')),
  notes        text,
  decided_by   uuid REFERENCES users(id),
  decided_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE attendance_records (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  work_date  date NOT NULL,
  status     text NOT NULL CHECK (status IN ('PRESENT','LATE','ABSENT','ON_LEAVE','OFF_DUTY')),
  clock_in   timestamptz,
  clock_out  timestamptz,
  notes      text,
  recorded_by uuid REFERENCES users(id),
  UNIQUE (staff_id, work_date)
);

CREATE TABLE duty_roster (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  duty_date   date NOT NULL,
  shift       text NOT NULL CHECK (shift IN ('MORNING','AFTERNOON','NIGHT','ON_CALL')),
  scanner_id  uuid REFERENCES scanners(id),
  role_note   text,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, duty_date, shift)
);
CREATE INDEX roster_date_idx ON duty_roster (duty_date);

-- ---------------------------------------------------------------------
-- Incidents & infection control
-- ---------------------------------------------------------------------
CREATE TABLE incidents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no             text NOT NULL UNIQUE,
  occurred_at        timestamptz NOT NULL,
  category           text NOT NULL CHECK (category IN
                     ('PATIENT','CONTRAST_REACTION','EXTRAVASATION','PROJECTILE','MRI_BURN','FALL','NEAR_MISS','EQUIPMENT_FAILURE','MRI_SAFETY','OTHER')),
  severity           text NOT NULL CHECK (severity IN ('NO_HARM','LOW','MODERATE','SEVERE','CRITICAL')),
  location           text,
  description        text NOT NULL,
  immediate_action   text,
  persons_involved   text,
  patient_id         uuid REFERENCES patients(id),
  appointment_id     uuid REFERENCES appointments(id),
  investigation      text,
  corrective_action  text,
  preventive_action  text,
  responsible_officer text,
  status             text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','UNDER_INVESTIGATION','ACTION_PLANNED','CLOSED')),
  closed_at          timestamptz,
  closure_notes      text,
  reported_by        uuid REFERENCES users(id),
  is_demo            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incidents_at_idx ON incidents (occurred_at DESC);

ALTER TABLE contrast_administrations
  ADD CONSTRAINT cadmin_incident_fk FOREIGN KEY (incident_id) REFERENCES incidents(id);

CREATE TABLE cleaning_areas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  frequency   text NOT NULL CHECK (frequency IN ('BETWEEN_PATIENTS','DAILY','WEEKLY','MONTHLY')),
  checklist   jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array of strings
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0
);

CREATE TABLE cleaning_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id      uuid NOT NULL REFERENCES cleaning_areas(id),
  cleaned_at   timestamptz NOT NULL,
  staff_id     uuid NOT NULL REFERENCES staff(id),
  checklist    jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {item: true|false}
  compliant    boolean NOT NULL,
  notes        text,
  verified_by  uuid REFERENCES users(id),
  verified_at  timestamptz,
  recorded_by  uuid REFERENCES users(id),
  is_demo      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cleaning_at_idx ON cleaning_records (cleaned_at DESC);

-- ---------------------------------------------------------------------
-- Report export log (controlled data exports)
-- ---------------------------------------------------------------------
CREATE TABLE report_exports (
  id          bigserial PRIMARY KEY,
  report      text NOT NULL,
  format      text NOT NULL CHECK (format IN ('PDF','XLSX')),
  params      jsonb,
  user_id     uuid REFERENCES users(id),
  at          timestamptz NOT NULL DEFAULT now()
);

-- Accession number sequence
CREATE SEQUENCE accession_seq START 1000;
CREATE SEQUENCE incident_seq START 1;
