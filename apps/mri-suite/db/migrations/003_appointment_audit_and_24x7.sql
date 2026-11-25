-- =====================================================================
-- Migration 003
--  1. Automatic, append-only appointment audit trail (database trigger):
--     every INSERT / UPDATE / DELETE on appointments is captured with the
--     acting user, time and a field-by-field before/after record.
--  2. The MRI unit operates 24/7 – operating hours set to 24 hours every day.
-- =====================================================================

CREATE TABLE appointment_audit (
  id              bigserial PRIMARY KEY,
  at              timestamptz NOT NULL DEFAULT clock_timestamp(),
  appointment_id  uuid NOT NULL,              -- no FK: the trail must outlive the appointment row
  accession_no    text,
  patient_id      uuid,
  operation       text NOT NULL CHECK (operation IN ('CREATED','UPDATED','DELETED')),
  changed_fields  jsonb,                      -- {field: {from, to}} for UPDATED
  snapshot        jsonb NOT NULL,             -- full row after the change (before, for DELETED)
  changed_by      uuid,
  changed_by_name text,
  changed_by_role text,
  source          text NOT NULL
);
CREATE INDEX appt_audit_appt_idx ON appointment_audit (appointment_id, at);
CREATE INDEX appt_audit_at_idx ON appointment_audit (at DESC);
CREATE INDEX appt_audit_user_idx ON appointment_audit (changed_by);

CREATE OR REPLACE FUNCTION appointment_audit_capture() RETURNS trigger AS $$
DECLARE
  v_uid   uuid := NULLIF(current_setting('app.user_id', true), '')::uuid;
  v_name  text := NULLIF(current_setting('app.user_name', true), '');
  v_role  text := NULLIF(current_setting('app.user_role', true), '');
  v_src   text := COALESCE(NULLIF(current_setting('app.source', true), ''), 'Direct database change (no application user)');
  v_diff  jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO appointment_audit (appointment_id, accession_no, patient_id, operation, changed_fields, snapshot, changed_by, changed_by_name, changed_by_role, source)
    VALUES (NEW.id, NEW.accession_no, NEW.patient_id, 'CREATED', NULL, to_jsonb(NEW), v_uid, v_name, v_role, v_src);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)) INTO v_diff
      FROM jsonb_each(to_jsonb(NEW)) n JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
     WHERE n.value IS DISTINCT FROM o.value AND n.key NOT IN ('updated_at');
    IF v_diff IS NULL THEN RETURN NEW; END IF;
    INSERT INTO appointment_audit (appointment_id, accession_no, patient_id, operation, changed_fields, snapshot, changed_by, changed_by_name, changed_by_role, source)
    VALUES (NEW.id, NEW.accession_no, NEW.patient_id, 'UPDATED', v_diff, to_jsonb(NEW), v_uid, v_name, v_role, v_src);
    RETURN NEW;
  ELSE
    INSERT INTO appointment_audit (appointment_id, accession_no, patient_id, operation, changed_fields, snapshot, changed_by, changed_by_name, changed_by_role, source)
    VALUES (OLD.id, OLD.accession_no, OLD.patient_id, 'DELETED', NULL, to_jsonb(OLD), v_uid, v_name, v_role, v_src);
    RETURN OLD;
  END IF;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_audit_trail
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION appointment_audit_capture();

-- The trail is append-only.
CREATE TRIGGER appointment_audit_no_change BEFORE UPDATE OR DELETE ON appointment_audit
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

-- Backfill: existing appointments get a CREATED entry from their booking record.
INSERT INTO appointment_audit (at, appointment_id, accession_no, patient_id, operation, snapshot, changed_by, changed_by_name, changed_by_role, source)
SELECT a.created_at, a.id, a.accession_no, a.patient_id, 'CREATED', to_jsonb(a), a.booked_by, u.full_name, r.name, 'Backfilled from booking record (pre-dates audit trail)'
  FROM appointments a LEFT JOIN users u ON u.id = a.booked_by LEFT JOIN roles r ON r.id = u.role_id;

-- Permission to view the appointment audit trail.
INSERT INTO permissions (code, module, description, is_sensitive)
VALUES ('appointments.audit', 'Appointments', 'View the appointment audit trail', true) ON CONFLICT (code) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_code)
SELECT id, 'appointments.audit' FROM roles WHERE code IN ('SUPERVISOR', 'SYSADMIN') ON CONFLICT DO NOTHING;

-- 24/7 operation.
UPDATE settings SET value = '{"0":{"open":"00:00","close":"24:00"},"1":{"open":"00:00","close":"24:00"},"2":{"open":"00:00","close":"24:00"},"3":{"open":"00:00","close":"24:00"},"4":{"open":"00:00","close":"24:00"},"5":{"open":"00:00","close":"24:00"},"6":{"open":"00:00","close":"24:00"}}'::jsonb,
                    updated_at = now()
 WHERE key = 'operatingHours';
