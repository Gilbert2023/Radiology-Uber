// Departmental analytics. Every figure is computed from database records for the requested
// period [from, toExclusive) in the department time zone. Definitions are exported so the UI
// and printed reports can state exactly how each number was derived.
import { q, one } from "@/lib/db";
import { TZ, zonedToUtc, addDays, weekday, localDate } from "@/lib/time";
import { getSettings, availableMinutes, type DeptSettings } from "./settings";

export interface Period { from: string; to: string } // to = exclusive date
const bounds = (p: Period) => [zonedToUtc(p.from), zonedToUtc(p.to)] as const;

export const DEFINITIONS = {
  examinationsPerformed: "Examinations with a scan record whose scan started within the period.",
  utilisation: "Scanner utilisation (%) = Actual scanning hours ÷ Available scanner hours × 100.",
  availableHours: "Available scanner hours = configured operating hours for each day in the period (System Settings), per active scanner. Downtime is reported separately and is not deducted.",
  scanningHours: "Actual scanning hours = Σ (scan end − scan start) for scans started in the period.",
  idle: "Idle time = Available hours − Actual scanning hours − Downtime falling within operating hours (minimum 0).",
  pacsSuccess: "Upload success rate = uploads currently 'Successfully uploaded' ÷ all PACS records created for scans in the period.",
  pacsFailure: "Upload failure rate = uploads currently 'Upload failed' or 'Requires investigation' ÷ all PACS records in the period.",
  pacsTime: "Average upload time = mean of (upload completion − scan end) for successful uploads.",
  waitArrivalScreening: "Arrival → screening = first screening record time − arrival time.",
  waitScreeningScan: "Screening → scanning = scan start time − safety clearance decision time.",
  journey: "Total journey = arrival → examination completed (PACS upload confirmed).",
  screeningCompliance: "Screening compliance = scans where a CLEAR safety decision was recorded before scan start ÷ all scans.",
  qcCompliance: "QC compliance = operating days with at least one daily QC session recorded ÷ operating days in the period (per scanner).",
  cleaningCompliance: "Infection-control compliance = cleaning records with every checklist item completed ÷ all cleaning records.",
};

const SHIFT_HOURS: Record<string, number> = { MORNING: 6.5, AFTERNOON: 6, NIGHT: 11.5, ON_CALL: 0 };

export async function examVolume(p: Period) {
  const [f, t] = bounds(p);
  const base = `FROM scan_records sr JOIN appointments a ON a.id=sr.appointment_id JOIN exam_types e ON e.id=a.exam_type_id WHERE sr.started_at >= $1 AND sr.started_at < $2`;
  const [totals, byRegion, byDept, byExam, byDay] = await Promise.all([
    one(`SELECT count(*)::int AS total,
                count(*) FILTER (WHERE a.contrast)::int AS contrast,
                count(*) FILTER (WHERE NOT a.contrast)::int AS non_contrast,
                count(*) FILTER (WHERE a.patient_type='INPATIENT')::int AS inpatient,
                count(*) FILTER (WHERE a.patient_type='OUTPATIENT')::int AS outpatient,
                count(*) FILTER (WHERE a.patient_type='EMERGENCY')::int AS emergency,
                count(*) FILTER (WHERE a.status='COMPLETED')::int AS completed,
                count(*) FILTER (WHERE sr.completion_status='INCOMPLETE')::int AS incomplete,
                count(*) FILTER (WHERE a.status='SCANNED')::int AS awaiting_pacs,
                count(*) FILTER (WHERE sr.repeat_sequences > 0)::int AS with_repeats,
                COALESCE(sum(sr.repeat_sequences),0)::int AS repeat_sequences
           ${base}`, [f, t]),
    q(`SELECT a.body_region AS key, count(*)::int AS n ${base} GROUP BY 1 ORDER BY 2 DESC`, [f, t]),
    q(`SELECT a.referring_department AS key, count(*)::int AS n ${base} GROUP BY 1 ORDER BY 2 DESC`, [f, t]),
    q(`SELECT e.name AS key, count(*)::int AS n ${base} GROUP BY 1 ORDER BY 2 DESC`, [f, t]),
    q(`SELECT to_char(sr.started_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS day, count(*)::int AS n,
              count(*) FILTER (WHERE a.contrast)::int AS contrast ${base} GROUP BY 1 ORDER BY 1`, [f, t]),
  ]);
  return { totals: totals!, byRegion, byDept, byExam, byDay };
}

export async function volumeSeries(granularity: "day" | "week" | "month" | "year", p: Period) {
  const [f, t] = bounds(p);
  return q(`SELECT to_char(date_trunc('${granularity}', sr.started_at AT TIME ZONE '${TZ}'), 'YYYY-MM-DD') AS bucket, count(*)::int AS n
              FROM scan_records sr WHERE sr.started_at >= $1 AND sr.started_at < $2 GROUP BY 1 ORDER BY 1`, [f, t]);
}

function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart)) / 60000;
}

export async function utilisation(p: Period, settings?: DeptSettings) {
  const s = settings ?? (await getSettings());
  const [f, t] = bounds(p);
  const scanners = await q(`SELECT id, name, model, field_strength_t FROM scanners WHERE is_active ORDER BY name`);
  const availPerScanner = availableMinutes(s, p.from, p.to, addDays, weekday);
  let operatingDays = 0;
  for (let d = p.from; d < p.to; d = addDays(d, 1)) if (s.operatingHours[String(weekday(d))]) operatingDays++;
  const rows = [];
  for (const sc of scanners) {
    const scan = await one(`SELECT count(*)::int AS n, COALESCE(sum(extract(epoch FROM (ended_at - started_at))/60),0) AS minutes,
                                   COALESCE(avg(extract(epoch FROM (ended_at - started_at))/60),0) AS avg_minutes
                              FROM scan_records WHERE scanner_id=$1 AND started_at >= $2 AND started_at < $3 AND ended_at IS NOT NULL`, [sc.id, f, t]);
    const down = await q(`SELECT downtime_start, COALESCE(downtime_end, now()) AS downtime_end FROM maintenance_events
                           WHERE scanner_id=$1 AND downtime_start IS NOT NULL AND downtime_start < $3 AND COALESCE(downtime_end, now()) > $2`, [sc.id, f, t]);
    let downtimeTotal = 0, downtimeOperating = 0;
    for (const dt of down) {
      const ds = new Date(dt.downtime_start).getTime(), de = new Date(dt.downtime_end).getTime();
      downtimeTotal += overlapMinutes(ds, de, f.getTime(), t.getTime());
      for (let d = p.from; d < p.to; d = addDays(d, 1)) {
        const h = s.operatingHours[String(weekday(d))];
        if (!h) continue;
        downtimeOperating += overlapMinutes(ds, de, zonedToUtc(d, h.open).getTime(), zonedToUtc(d, h.close).getTime());
      }
    }
    const scanning = scan!.minutes as number;
    rows.push({
      scannerId: sc.id, scanner: sc.name, model: sc.model,
      examinations: scan!.n, availableHours: availPerScanner / 60, scanningHours: scanning / 60,
      utilisationPct: availPerScanner ? (scanning / availPerScanner) * 100 : null,
      avgExamMinutes: scan!.n ? scan!.avg_minutes : null,
      downtimeHours: downtimeTotal / 60, downtimeOperatingHours: downtimeOperating / 60,
      idleHours: Math.max(0, availPerScanner - scanning - downtimeOperating) / 60,
      operatingDays, examsPerOperatingDay: operatingDays ? scan!.n / operatingDays : null,
    });
  }
  const byHour = await q(`SELECT extract(hour FROM started_at AT TIME ZONE '${TZ}')::int AS hour, count(*)::int AS n,
                                 COALESCE(sum(extract(epoch FROM (ended_at - started_at))/60),0) AS minutes
                            FROM scan_records WHERE started_at >= $1 AND started_at < $2 AND ended_at IS NOT NULL GROUP BY 1 ORDER BY 1`, [f, t]);
  const daily = await q(`SELECT to_char(started_at AT TIME ZONE '${TZ}','YYYY-MM-DD') AS day, COALESCE(sum(extract(epoch FROM (ended_at - started_at))/60),0) AS minutes
                           FROM scan_records WHERE started_at >= $1 AND started_at < $2 AND ended_at IS NOT NULL GROUP BY 1 ORDER BY 1`, [f, t]);
  const dailyWithAvail = daily.map((d: any) => {
    const h = s.operatingHours[String(weekday(d.day))];
    const avail = h ? availableMinutes(s, d.day, addDays(d.day, 1), addDays, weekday) * scanners.length : 0;
    return { day: d.day, scanningHours: d.minutes / 60, availableHours: avail / 60, pct: avail ? (d.minutes / avail) * 100 : null };
  });
  return { scanners: rows, byHour, daily: dailyWithAvail, operatingHours: s.operatingHours };
}

export async function waitingTimes(p: Period) {
  const [f, t] = bounds(p);
  const s = await getSettings();
  const agg = await one(
    `WITH x AS (
       SELECT a.id, a.created_at, a.scheduled_start, a.arrived_at, a.completed_at, a.status,
              (SELECT min(at) FROM workflow_events w WHERE w.appointment_id=a.id AND w.event='SCREENING_RECORDED') AS screened_at,
              ss.decision_at, sr.started_at AS scan_start
         FROM appointments a LEFT JOIN safety_screenings ss ON ss.appointment_id=a.id AND ss.status='CLEAR'
         LEFT JOIN scan_records sr ON sr.appointment_id=a.id
        WHERE a.scheduled_start >= $1 AND a.scheduled_start < $2)
     SELECT
       count(*)::int AS appointments,
       avg(extract(epoch FROM (scheduled_start - created_at))/86400) AS booking_lead_days,
       avg(extract(epoch FROM (screened_at - arrived_at))/60) FILTER (WHERE screened_at IS NOT NULL AND arrived_at IS NOT NULL) AS arrival_to_screening,
       avg(extract(epoch FROM (scan_start - decision_at))/60) FILTER (WHERE scan_start IS NOT NULL AND decision_at IS NOT NULL) AS screening_to_scan,
       avg(extract(epoch FROM (scan_start - arrived_at))/60) FILTER (WHERE scan_start IS NOT NULL AND arrived_at IS NOT NULL) AS arrival_to_scan,
       avg(extract(epoch FROM (completed_at - arrived_at))/60) FILTER (WHERE completed_at IS NOT NULL AND arrived_at IS NOT NULL) AS journey,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY extract(epoch FROM (scan_start - arrived_at))/60) FILTER (WHERE scan_start IS NOT NULL AND arrived_at IS NOT NULL) AS arrival_to_scan_p90,
       count(*) FILTER (WHERE scan_start IS NOT NULL AND scan_start > scheduled_start + make_interval(mins => $3))::int AS delayed,
       count(*) FILTER (WHERE status='NO_SHOW')::int AS no_shows,
       count(*) FILTER (WHERE status='CANCELLED')::int AS cancellations,
       count(*) FILTER (WHERE arrived_at IS NOT NULL)::int AS arrived
     FROM x`, [f, t, s.lateGraceMinutes]);
  const byDay = await q(
    `SELECT to_char(a.scheduled_start AT TIME ZONE '${TZ}','YYYY-MM-DD') AS day,
            avg(extract(epoch FROM (sr.started_at - a.arrived_at))/60) AS arrival_to_scan,
            avg(extract(epoch FROM (a.completed_at - a.arrived_at))/60) AS journey
       FROM appointments a LEFT JOIN scan_records sr ON sr.appointment_id=a.id
      WHERE a.scheduled_start >= $1 AND a.scheduled_start < $2 AND a.arrived_at IS NOT NULL GROUP BY 1 ORDER BY 1`, [f, t]);
  const cancelReasons = await q(`SELECT COALESCE(cancel_reason,'Not recorded') AS key, count(*)::int AS n FROM appointments WHERE status='CANCELLED' AND scheduled_start >= $1 AND scheduled_start < $2 GROUP BY 1 ORDER BY 2 DESC LIMIT 8`, [f, t]);
  return { ...agg!, byDay, cancelReasons, lateGraceMinutes: s.lateGraceMinutes };
}

export async function pacsKpis(p: Period) {
  const [f, t] = bounds(p);
  const base = `FROM pacs_uploads pu JOIN scan_records sr ON sr.id=pu.scan_record_id WHERE sr.started_at >= $1 AND sr.started_at < $2`;
  const k = await one(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE pu.status='SUCCESSFULLY_UPLOADED')::int AS success,
        count(*) FILTER (WHERE pu.status='SUCCESSFULLY_UPLOADED' AND pu.verification_status='VERIFIED')::int AS verified,
        count(*) FILTER (WHERE pu.status='UPLOAD_FAILED')::int AS failed,
        count(*) FILTER (WHERE pu.status IN ('PENDING_UPLOAD','UPLOADING'))::int AS pending,
        count(*) FILTER (WHERE pu.status='REQUIRES_INVESTIGATION')::int AS investigation,
        avg(extract(epoch FROM (pu.completed_at - sr.ended_at))/60) FILTER (WHERE pu.status='SUCCESSFULLY_UPLOADED' AND pu.completed_at IS NOT NULL) AS avg_minutes,
        count(*) FILTER (WHERE pu.attempts > 1)::int AS retried
      ${base}`, [f, t]);
  const completedExams = await one(`SELECT count(*)::int AS n FROM scan_records WHERE started_at >= $1 AND started_at < $2 AND ended_at IS NOT NULL`, [f, t]);
  const trend = async (g: string) => q(`SELECT to_char(date_trunc('${g}', sr.started_at AT TIME ZONE '${TZ}'),'YYYY-MM-DD') AS bucket,
        count(*)::int AS total, count(*) FILTER (WHERE pu.status='SUCCESSFULLY_UPLOADED')::int AS success,
        count(*) FILTER (WHERE pu.status IN ('UPLOAD_FAILED','REQUIRES_INVESTIGATION'))::int AS failed,
        count(*) FILTER (WHERE pu.status IN ('PENDING_UPLOAD','UPLOADING'))::int AS pending ${base} GROUP BY 1 ORDER BY 1`, [f, t]);
  const [daily, weekly, monthly, byRadiographer] = await Promise.all([trend("day"), trend("week"), trend("month"),
    q(`SELECT st.full_name AS radiographer, count(*)::int AS total,
              count(*) FILTER (WHERE pu.status='SUCCESSFULLY_UPLOADED')::int AS success,
              count(*) FILTER (WHERE pu.status IN ('UPLOAD_FAILED','REQUIRES_INVESTIGATION'))::int AS failed,
              count(*) FILTER (WHERE pu.status IN ('PENDING_UPLOAD','UPLOADING'))::int AS pending,
              avg(extract(epoch FROM (pu.completed_at - sr.ended_at))/60) FILTER (WHERE pu.status='SUCCESSFULLY_UPLOADED') AS avg_minutes
         FROM pacs_uploads pu JOIN scan_records sr ON sr.id=pu.scan_record_id JOIN staff st ON st.id=sr.radiographer_id
        WHERE sr.started_at >= $1 AND sr.started_at < $2 GROUP BY 1 ORDER BY 2 DESC`, [f, t])]);
  const total = k!.total || 0;
  return {
    ...k!, completedExams: completedExams!.n,
    successRate: total ? (k!.success / total) * 100 : null,
    failureRate: total ? ((k!.failed + k!.investigation) / total) * 100 : null,
    daily, weekly, monthly, byRadiographer,
  };
}

export async function qualitySafety(p: Period) {
  const [f, t] = bounds(p);
  const s = await getSettings();
  const scr = await one(`SELECT count(*)::int AS scans,
        count(*) FILTER (WHERE ss.status='CLEAR' AND ss.decision_at IS NOT NULL AND ss.decision_at <= sr.started_at)::int AS compliant
      FROM scan_records sr LEFT JOIN safety_screenings ss ON ss.appointment_id=sr.appointment_id WHERE sr.started_at >= $1 AND sr.started_at < $2`, [f, t]);
  const contrast = await one(`SELECT count(*)::int AS administrations, count(*) FILTER (WHERE adverse_reaction)::int AS reactions,
        count(*) FILTER (WHERE extravasation)::int AS extravasations, COALESCE(sum(dose_ml),0) AS total_ml
      FROM contrast_administrations WHERE administered_at >= $1 AND administered_at < $2`, [f, t]);
  const scans = await one(`SELECT count(*) FILTER (WHERE completion_status='INCOMPLETE')::int AS incomplete, count(*) FILTER (WHERE repeat_sequences>0)::int AS with_repeats,
        COALESCE(sum(repeat_sequences),0)::int AS repeats FROM scan_records WHERE started_at >= $1 AND started_at < $2`, [f, t]);
  const incidents = await q(`SELECT category AS key, count(*)::int AS n FROM incidents WHERE occurred_at >= $1 AND occurred_at < $2 GROUP BY 1 ORDER BY 2 DESC`, [f, t]);
  const cleaning = await one(`SELECT count(*)::int AS total, count(*) FILTER (WHERE compliant)::int AS compliant, count(*) FILTER (WHERE verified_at IS NOT NULL)::int AS verified
      FROM cleaning_records WHERE cleaned_at >= $1 AND cleaned_at < $2`, [f, t]);
  // QC compliance per scanner
  const scanners = await q(`SELECT id, name FROM scanners WHERE is_active`);
  const qc = [];
  let opDays: string[] = [];
  for (let d = p.from; d < p.to && d <= localDate(); d = addDays(d, 1)) if (s.operatingHours[String(weekday(d))]) opDays.push(d);
  for (const sc of scanners) {
    const days = await q(`SELECT DISTINCT to_char(performed_at AT TIME ZONE '${TZ}','YYYY-MM-DD') AS d FROM qc_sessions WHERE scanner_id=$1 AND frequency='DAILY' AND performed_at >= $2 AND performed_at < $3`, [sc.id, f, t]);
    const set = new Set(days.map((x) => x.d));
    const done = opDays.filter((d) => set.has(d)).length;
    const res = await one(`SELECT count(*)::int AS sessions, count(*) FILTER (WHERE overall_result='FAIL')::int AS fails, count(*) FILTER (WHERE verified_at IS NOT NULL)::int AS verified
                           FROM qc_sessions WHERE scanner_id=$1 AND performed_at >= $2 AND performed_at < $3`, [sc.id, f, t]);
    qc.push({ scanner: sc.name, operatingDays: opDays.length, daysWithDailyQc: done, compliancePct: opDays.length ? (done / opDays.length) * 100 : null, ...res! });
  }
  return {
    screening: { ...scr!, compliancePct: scr!.scans ? (scr!.compliant / scr!.scans) * 100 : null },
    contrast: contrast!, scans: scans!, incidents, incidentTotal: incidents.reduce((a, b) => a + b.n, 0),
    cleaning: { ...cleaning!, compliancePct: cleaning!.total ? (cleaning!.compliant / cleaning!.total) * 100 : null }, qc,
  };
}

export async function staffWorkload(p: Period) {
  const [f, t] = bounds(p);
  const staff = await q(`SELECT id, full_name, designation, contracted_hours_week FROM staff WHERE employment_status <> 'LEFT' ORDER BY full_name`);
  const rows = [];
  for (const st of staff) {
    const ex = await one(`SELECT count(*)::int AS exams, count(*) FILTER (WHERE a.contrast)::int AS contrast_exams,
          count(*) FILTER (WHERE e.body_region IN ('CARDIAC','ABDOMEN','PELVIS','VASCULAR'))::int AS complex_exams,
          COALESCE(sum(extract(epoch FROM (sr.ended_at - sr.started_at))/3600),0) AS scan_hours
        FROM scan_records sr JOIN appointments a ON a.id=sr.appointment_id JOIN exam_types e ON e.id=a.exam_type_id
        WHERE sr.radiographer_id=$1 AND sr.started_at >= $2 AND sr.started_at < $3`, [st.id, f, t]);
    const roster = await q(`SELECT shift, count(*)::int AS n FROM duty_roster WHERE staff_id=$1 AND duty_date >= $2 AND duty_date < $3 GROUP BY 1`, [st.id, p.from, p.to]);
    const att = await one(`SELECT count(*) FILTER (WHERE status='PRESENT')::int AS present, count(*) FILTER (WHERE status='LATE')::int AS late,
          count(*) FILTER (WHERE status='ABSENT')::int AS absent FROM attendance_records WHERE staff_id=$1 AND work_date >= $2 AND work_date < $3`, [st.id, p.from, p.to]);
    const tr = await one(`SELECT count(*)::int AS n, COALESCE(sum(hours),0) AS hours FROM training_records WHERE staff_id=$1 AND completed_on >= $2 AND completed_on < $3`, [st.id, p.from, p.to]);
    const comp = await one(`SELECT count(*)::int AS n, count(*) FILTER (WHERE expires_on IS NOT NULL AND expires_on < current_date)::int AS expired FROM staff_competencies WHERE staff_id=$1`, [st.id]);
    const shifts = roster.reduce((a, r) => a + (r.shift === "ON_CALL" ? 0 : r.n), 0);
    const rosteredHours = roster.reduce((a, r) => a + r.n * (SHIFT_HOURS[r.shift] ?? 0), 0);
    rows.push({
      staffId: st.id, name: st.full_name, designation: st.designation, ...ex!, shifts, rosteredHours,
      onCall: roster.find((r) => r.shift === "ON_CALL")?.n ?? 0,
      examsPerRosteredHour: rosteredHours ? ex!.exams / rosteredHours : null,
      ...att!, trainingCount: tr!.n, trainingHours: tr!.hours, competencies: comp!.n, expiredCompetencies: comp!.expired,
    });
  }
  return rows;
}

export async function monthlyReport(month: string) {
  const from = month + "-01";
  const [y, m] = month.split("-").map(Number);
  const to = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const p = { from, to };
  const [volume, util, waits, pacs, quality, staff] = await Promise.all([examVolume(p), utilisation(p), waitingTimes(p), pacsKpis(p), qualitySafety(p), staffWorkload(p)]);
  const maintenance = await q(`SELECT me.event_type, me.reported_at, me.status, me.fault_description, sc.name AS scanner,
        extract(epoch FROM (COALESCE(me.downtime_end, now()) - me.downtime_start))/3600 AS downtime_hours
      FROM maintenance_events me JOIN scanners sc ON sc.id=me.scanner_id WHERE me.reported_at >= $1 AND me.reported_at < $2 ORDER BY me.reported_at`, [zonedToUtc(from), zonedToUtc(to)]);
  const contrastUsage = await q(`SELECT ag.name, count(*)::int AS administrations, COALESCE(sum(ca.dose_ml),0) AS total_ml
      FROM contrast_administrations ca JOIN contrast_agents ag ON ag.id=ca.agent_id WHERE ca.administered_at >= $1 AND ca.administered_at < $2 GROUP BY 1 ORDER BY 1`, [zonedToUtc(from), zonedToUtc(to)]);
  return { period: p, volume, util, waits, pacs, quality, staff, maintenance, contrastUsage };
}
