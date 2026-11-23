import { Timer } from "lucide-react";
import { requireActor } from "@/server/auth";
import { waitingTimes, DEFINITIONS } from "@/server/analytics";
import { PageHeader, Card, StatCard, Notice } from "@/components/ui";
import { PeriodFilter, resolvePeriod } from "@/components/PeriodFilter";
import { Lines, Bars } from "@/components/client/charts";
import { fmtMinutes } from "@/lib/time";
export const metadata = { title: "Patient Waiting Time Analysis" };
export default async function Waiting({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireActor("analytics.view");
  const sp = await searchParams;
  const p = resolvePeriod(sp);
  const w = await waitingTimes(p);
  return (
    <div>
      <PageHeader title="Patient Waiting Time Analysis" icon={Timer} description="Appointment lead time, in-department waiting at each stage, delays, no-shows and cancellations." />
      <PeriodFilter sp={sp} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Appointments" value={w.appointments} tone="brand" /><StatCard label="Booking lead time" value={w.booking_lead_days !== null ? `${w.booking_lead_days.toFixed(1)} d` : "—"} tone="sky" />
        <StatCard label="Arrival → screening" value={fmtMinutes(w.arrival_to_screening)} tone="accent" /><StatCard label="Screening → scan" value={fmtMinutes(w.screening_to_scan)} tone="violet" />
        <StatCard label="Arrival → scan (mean)" value={fmtMinutes(w.arrival_to_scan)} tone="indigo" /><StatCard label="Arrival → scan (90th %ile)" value={fmtMinutes(w.arrival_to_scan_p90)} tone="amber" />
        <StatCard label="Total journey" value={fmtMinutes(w.journey)} tone="green" /><StatCard label="Delayed starts" value={w.delayed} tone="red" hint={`> ${w.lateGraceMinutes} min after slot`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Daily mean waits (minutes)"><Lines data={w.byDay} x="day" unit="m" series={[{ key: "arrival_to_scan", label: "Arrival → scan" }, { key: "journey", label: "Total journey" }]} /></Card>
        <Card title="Attendance outcomes"><Bars data={[{ k: "Arrived", n: w.arrived }, { k: "No-show", n: w.no_shows }, { k: "Cancelled", n: w.cancellations }]} x="k" series={[{ key: "n", label: "Appointments" }]} /></Card>
        <Card title="Cancellation reasons" className="xl:col-span-2"><Bars data={w.cancelReasons} x="key" horizontal series={[{ key: "n", label: "Cancellations", color: "#64748b" }]} height={240} /></Card>
      </div>
      <Notice className="mt-4" title="Definitions">{DEFINITIONS.waitArrivalScreening} {DEFINITIONS.waitScreeningScan} {DEFINITIONS.journey} Booking lead time = scheduled start − booking date.</Notice>
    </div>
  );
}
