import { notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { requireActor } from "@/server/auth";
import { one } from "@/lib/db";
import { listExamTypes, listScanners, listStaff } from "@/server/queries";
import { PageHeader } from "@/components/ui";
import { AppointmentForm } from "@/components/client/AppointmentForm";
import { BODY_REGIONS } from "@/lib/constants";
import { localDate, localTime } from "@/lib/time";
import { updateAppointmentAction } from "../../actions";

export default async function EditAppointment({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("appointments.manage");
  const { id } = await params;
  const a = await one(`SELECT a.*, p.full_name, p.mrn, p.dob::text AS dob, p.sex FROM appointments a JOIN patients p ON p.id=a.patient_id WHERE a.id=$1`, [id]);
  if (!a) notFound();
  const [examTypes, scanners, radiographers] = await Promise.all([listExamTypes(false), listScanners(), listStaff("radiographers")]);
  const duration = Math.round((new Date(a.scheduled_end).getTime() - new Date(a.scheduled_start).getTime()) / 60000);
  return (
    <div>
      <PageHeader title={`Edit / reschedule ${a.accession_no}`} icon={CalendarClock} description={a.status === "BOOKED" ? "Changing the date, time or scanner counts as a reschedule and is recorded in the patient journey." : "Patient has arrived: date, time and scanner can no longer be changed."}
        crumbs={[{ label: "Appointments", href: "/appointments" }, { label: a.accession_no, href: `/appointments/${id}` }, { label: "Edit" }]} />
      <AppointmentForm action={updateAppointmentAction} isEdit examTypes={examTypes} scanners={scanners} radiographers={radiographers} regions={BODY_REGIONS}
        patient={{ id: a.patient_id, mrn: a.mrn, full_name: a.full_name, dob: a.dob, sex: a.sex }} submitLabel="Save changes"
        initial={{ id, examTypeId: a.exam_type_id, bodyRegion: a.body_region, contrast: a.contrast, clinicalIndication: a.clinical_indication, referringDoctor: a.referring_doctor,
          referringDepartment: a.referring_department, patientType: a.patient_type, priority: a.priority, preferredDate: a.preferred_date, date: localDate(a.scheduled_start),
          time: localTime(a.scheduled_start), durationMin: String(duration), scannerId: a.scanner_id, radiographerId: a.radiographer_id, notes: a.notes }} />
    </div>
  );
}
