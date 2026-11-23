import { CalendarPlus } from "lucide-react";
import { requireActor } from "@/server/auth";
import { one, q } from "@/lib/db";
import { listExamTypes, listScanners, listStaff } from "@/server/queries";
import { PageHeader, Card } from "@/components/ui";
import { HospitalLogo } from "@/components/brand";
import { AppointmentForm } from "@/components/client/AppointmentForm";
import { BODY_REGIONS } from "@/lib/constants";
import { localDate, isDateStr, zonedToUtc, addDays, fmtTime } from "@/lib/time";
import { createAppointmentAction } from "../actions";

export const metadata = { title: "New MRI appointment" };

export default async function NewAppointment({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireActor("appointments.manage");
  const sp = await searchParams;
  const date = isDateStr(sp.date) ? sp.date : localDate();
  const [examTypes, scanners, radiographers] = await Promise.all([listExamTypes(), listScanners(), listStaff("radiographers")]);
  const patient = sp.patientId ? await one(`SELECT id, mrn, full_name, dob::text AS dob, sex FROM patients WHERE id=$1`, [sp.patientId]) : null;
  const booked = await q(`SELECT a.scheduled_start, a.scheduled_end, s.name AS scanner, a.accession_no FROM appointments a JOIN scanners s ON s.id=a.scanner_id
     WHERE a.scheduled_start >= $1 AND a.scheduled_start < $2 AND a.status NOT IN ('CANCELLED','NO_SHOW') ORDER BY a.scheduled_start`, [zonedToUtc(date), zonedToUtc(addDays(date, 1))]);
  return (
    <div>
      <PageHeader title="New MRI appointment" icon={CalendarPlus} description="Booking creates the patient's entry on the MRI worklist (Stage 1 of the patient journey)."
        crumbs={[{ label: "Appointments", href: "/appointments" }, { label: "New" }]} logo={<HospitalLogo size="sm" showName={false} />} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <AppointmentForm action={createAppointmentAction} examTypes={examTypes} scanners={scanners} radiographers={radiographers} regions={BODY_REGIONS} patient={patient as any}
          submitLabel="Book appointment" initial={{ date, time: sp.time ?? "", scannerId: sp.scannerId }} />
        <Card title={`Booked on ${date}`} subtitle="Avoid these times – conflicts are blocked on save">
          {booked.length === 0 ? <p className="text-sm text-slate-500">No bookings yet.</p> : (
            <ul className="space-y-1 text-xs">
              {booked.map((b) => <li key={b.accession_no} className="flex justify-between rounded bg-slate-50 px-2 py-1"><span className="tabular-nums">{fmtTime(b.scheduled_start)}–{fmtTime(b.scheduled_end)}</span><span className="text-slate-500">{b.scanner}</span></li>)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
