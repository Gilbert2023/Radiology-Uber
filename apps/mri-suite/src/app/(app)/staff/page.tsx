import Link from "next/link";
import { clsx } from "clsx";
import { Users, UserPlus, CalendarRange, Plane, GraduationCap, ClipboardCheck, ChevronLeft, ChevronRight, X } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { PageHeader, Card, TabLinks, Badge, StatCard, EmptyState } from "@/components/ui";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { SHIFTS, labelize } from "@/lib/constants";
import { localDate, addDays, startOfWeek, fmtDate, isDateStr, fmtTime } from "@/lib/time";
import { StaffForm } from "@/components/StaffForm";
import { dutyAction, removeDutyAction, leaveAction, leaveDecisionAction, attendanceAction, trainingAction } from "./actions";

export const metadata = { title: "Staff & Duty Management" };
export default async function Staff({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireActor("staff.view");
  const sp = await searchParams;
  const tab = ["directory", "roster", "leave", "training", "attendance"].includes(sp.tab) ? sp.tab : "roster";
  const today = localDate();
  const week = startOfWeek(isDateStr(sp.week) ? sp.week : today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const staff = await q(`SELECT s.*, s.registration_expiry::text AS reg_exp, (SELECT count(*) FROM staff_competencies c WHERE c.staff_id=s.id)::int AS comps FROM staff s ORDER BY s.employment_status='LEFT', s.full_name`);
  const active = staff.filter((s) => s.employment_status !== "LEFT");
  const roster = await q(`SELECT r.*, r.duty_date::text AS d FROM duty_roster r WHERE duty_date BETWEEN $1 AND $2`, [week, addDays(week, 6)]);
  const leave = await q(`SELECT l.*, l.start_date::text AS s, l.end_date::text AS e, st.full_name, u.full_name AS decider FROM leave_records l JOIN staff st ON st.id=l.staff_id LEFT JOIN users u ON u.id=l.decided_by ORDER BY l.start_date DESC LIMIT 100`);
  const onLeave = (sid: string, d: string) => leave.find((l) => l.staff_id === sid && l.status === "APPROVED" && l.s <= d && l.e >= d);
  const can = { roster: actor.permissions.has("roster.manage"), staff: actor.permissions.has("staff.manage"), leave: actor.permissions.has("leave.approve") };
  const todayRoster = await q(`SELECT r.shift, st.full_name FROM duty_roster r JOIN staff st ON st.id=r.staff_id WHERE duty_date=$1 ORDER BY r.shift`, [today]);
  const expiringReg = active.filter((s) => s.reg_exp && s.reg_exp <= addDays(today, 60));
  return (
    <div>
      <PageHeader title="Staff & Duty Management" icon={Users} description="Duty roster, leave, attendance, training and competencies for the MRI unit."
        actions={can.staff && <Modal title="Add staff member" trigger={<><UserPlus className="h-4 w-4" />Add staff</>} triggerClass="btn-accent" wide><StaffForm /></Modal>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Active staff" value={active.length} icon={Users} tone="brand" />
        <StatCard label="On duty today" value={todayRoster.filter((r) => r.shift !== "ON_CALL").length} icon={CalendarRange} tone="accent" hint={todayRoster.filter((r) => r.shift === "ON_CALL").map((r) => r.full_name).join(", ") ? `On-call: ${todayRoster.filter((r) => r.shift === "ON_CALL").map((r) => r.full_name).join(", ")}` : undefined} />
        <StatCard label="Leave requests pending" value={leave.filter((l) => l.status === "REQUESTED").length} icon={Plane} tone="amber" href="?tab=leave" />
        <StatCard label="Registrations expiring ≤ 60 d" value={expiringReg.length} icon={GraduationCap} tone={expiringReg.length ? "red" : "green"} href="?tab=directory" />
      </div>
      <TabLinks active={tab} tabs={[{ key: "roster", label: "Duty roster", href: "?tab=roster" }, { key: "directory", label: "Staff directory", href: "?tab=directory" }, { key: "leave", label: "Leave & absence", href: "?tab=leave" }, { key: "attendance", label: "Attendance", href: "?tab=attendance" }, { key: "training", label: "Training", href: "?tab=training" }]} />
      {tab === "roster" && (
        <Card title={`Week of ${fmtDate(week)}`} actions={<><Link className="btn-secondary btn-sm" href={`?tab=roster&week=${addDays(week, -7)}`} aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></Link><Link className="btn-secondary btn-sm" href="?tab=roster">This week</Link><Link className="btn-secondary btn-sm" href={`?tab=roster&week=${addDays(week, 7)}`} aria-label="Next week"><ChevronRight className="h-4 w-4" /></Link>
          {can.roster && <Modal title="Assign shift" trigger="Assign shift" triggerClass="btn-accent btn-sm"><ActionForm action={dutyAction} className="space-y-3">
            <select name="staffId" className="input" required>{active.map((s) => <option key={s.id} value={s.id}>{s.full_name} – {s.designation}</option>)}</select>
            <input type="date" name="dutyDate" className="input" required defaultValue={today} />
            <select name="shift" className="input">{Object.entries(SHIFTS).map(([k, v]) => <option key={k} value={k}>{v.label} ({v.time})</option>)}</select>
            <input name="roleNote" className="input" placeholder="Allocation note (e.g. scanner 1, contrast lead)" /><SubmitButton>Assign</SubmitButton></ActionForm></Modal>}</>} bodyClass="p-0 overflow-x-auto">
          <table className="table min-w-[900px] text-xs"><thead><tr><th>Staff</th>{days.map((d) => <th key={d} className={clsx(d === today && "bg-accent-50 text-accent-800")}>{new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}</th>)}</tr></thead>
            <tbody>{active.map((s) => <tr key={s.id}><td className="whitespace-nowrap"><Link href={`/staff/${s.id}`} className="link">{s.full_name}</Link><div className="text-slate-500">{s.designation}</div></td>
              {days.map((d) => { const lv = onLeave(s.id, d); const shifts = roster.filter((r) => r.staff_id === s.id && r.d === d); return (
                <td key={d} className={clsx(d === today && "bg-accent-50/40")}>{lv ? <Badge className="bg-slate-100 text-slate-600 ring-slate-300">{labelize(lv.leave_type)} leave</Badge> :
                  <div className="flex flex-col gap-1">{shifts.map((r) => <span key={r.id} className={clsx("badge justify-between", SHIFTS[r.shift].badge)} title={r.role_note ?? ""}>{SHIFTS[r.shift].label}
                    {can.roster && <ActionForm action={removeDutyAction} className="inline"><input type="hidden" name="id" value={r.id} /><button className="ml-1 opacity-60 hover:opacity-100" aria-label="Remove shift"><X className="h-3 w-3" /></button></ActionForm>}</span>)}</div>}</td>); })}</tr>)}</tbody></table>
        </Card>
      )}
      {tab === "directory" && (
        <Card bodyClass="p-0 overflow-x-auto"><table className="table"><thead><tr><th>Name</th><th>Staff ID</th><th>Designation</th><th>Status</th><th>Contact</th><th>Registration</th><th>Competencies</th></tr></thead>
          <tbody>{staff.map((s) => <tr key={s.id}><td><Link className="link" href={`/staff/${s.id}`}>{s.full_name}</Link></td><td className="font-mono text-xs">{s.staff_no}</td><td>{s.designation}</td><td>{labelize(s.employment_status)}</td><td className="text-xs">{s.phone}<div>{s.email}</div></td>
            <td className="text-xs">{s.registration_body ?? "—"}<div>{s.registration_no}{s.reg_exp && <> · exp {fmtDate(s.reg_exp)} {s.reg_exp <= addDays(today, 60) && <Badge className="bg-red-50 text-red-700 ring-red-200">{s.reg_exp < today ? "Expired" : "Expiring"}</Badge>}</>}</div></td><td className="tabular-nums">{s.comps}</td></tr>)}</tbody></table></Card>
      )}
      {tab === "leave" && (
        <Card title="Leave & absence" actions={(can.roster || can.staff || can.leave) && <Modal title="Record leave request" trigger="Record leave" triggerClass="btn-accent btn-sm"><ActionForm action={leaveAction} className="space-y-3">
          <select name="staffId" className="input">{active.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
          <select name="leaveType" className="input">{["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "STUDY", "COMPASSIONATE", "OTHER"].map((t) => <option key={t} value={t}>{labelize(t)}</option>)}</select>
          <div className="grid grid-cols-2 gap-2"><input type="date" name="startDate" className="input" required /><input type="date" name="endDate" className="input" required /></div>
          <input name="notes" className="input" placeholder="Notes" /><SubmitButton>Save</SubmitButton></ActionForm></Modal>} bodyClass="p-0">
          {leave.length === 0 ? <div className="p-4"><EmptyState title="No leave recorded" /></div> : <table className="table"><thead><tr><th>Staff</th><th>Type</th><th>From</th><th>To</th><th>Status</th><th>Decided</th><th /></tr></thead>
            <tbody>{leave.map((l) => <tr key={l.id}><td>{l.full_name}</td><td>{labelize(l.leave_type)}</td><td>{fmtDate(l.s)}</td><td>{fmtDate(l.e)}</td><td>{labelize(l.status)}</td><td className="text-xs">{l.decider ?? "—"}</td>
              <td>{can.leave && l.status === "REQUESTED" && <div className="flex gap-1">{["APPROVED", "DECLINED"].map((d) => <ActionForm key={d} action={leaveDecisionAction} confirm={d === "APPROVED" ? "Approve? Any rostered shifts in this period will be removed." : undefined}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="decision" value={d} /><SubmitButton className={d === "APPROVED" ? "btn-accent btn-sm" : "btn-secondary btn-sm"} pendingText="…">{d === "APPROVED" ? "Approve" : "Decline"}</SubmitButton></ActionForm>)}</div>}</td></tr>)}</tbody></table>}
        </Card>
      )}
      {tab === "attendance" && <Attendance staff={active} can={can.roster} today={today} />}
      {tab === "training" && <Training staff={active} can={can.staff} />}
    </div>
  );
}

async function Attendance({ staff, can, today }: { staff: any[]; can: boolean; today: string }) {
  const rows = await q(`SELECT a.*, a.work_date::text AS d, st.full_name FROM attendance_records a JOIN staff st ON st.id=a.staff_id WHERE work_date >= $1 ORDER BY work_date DESC, st.full_name LIMIT 300`, [addDays(today, -14)]);
  return (
    <Card title="Attendance (last 14 days)" icon={ClipboardCheck} actions={can && <Modal title="Record attendance" trigger="Record attendance" triggerClass="btn-accent btn-sm"><ActionForm action={attendanceAction} className="space-y-3">
      <select name="staffId" className="input">{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select><input type="date" name="workDate" className="input" defaultValue={today} required />
      <select name="status" className="input">{["PRESENT", "LATE", "ABSENT", "ON_LEAVE", "OFF_DUTY"].map((s) => <option key={s} value={s}>{labelize(s)}</option>)}</select>
      <div className="grid grid-cols-2 gap-2"><div><label className="label">Clock in</label><input type="datetime-local" name="clockIn" className="input" /></div><div><label className="label">Clock out</label><input type="datetime-local" name="clockOut" className="input" /></div></div>
      <input name="notes" className="input" placeholder="Notes" /><SubmitButton>Save</SubmitButton></ActionForm></Modal>} bodyClass="p-0 overflow-x-auto">
      <table className="table text-xs"><thead><tr><th>Date</th><th>Staff</th><th>Status</th><th>In</th><th>Out</th><th>Notes</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{fmtDate(r.d)}</td><td>{r.full_name}</td><td><Badge className={r.status === "PRESENT" ? "bg-green-50 text-green-800 ring-green-200" : r.status === "LATE" ? "bg-amber-50 text-amber-800 ring-amber-200" : r.status === "ABSENT" ? "bg-red-50 text-red-700 ring-red-200" : undefined}>{labelize(r.status)}</Badge></td><td>{fmtTime(r.clock_in)}</td><td>{fmtTime(r.clock_out)}</td><td>{r.notes}</td></tr>)}</tbody></table>
    </Card>
  );
}

async function Training({ staff, can }: { staff: any[]; can: boolean }) {
  const rows = await q(`SELECT t.*, t.completed_on::text AS c, t.expires_on::text AS x, st.full_name FROM training_records t JOIN staff st ON st.id=t.staff_id ORDER BY t.completed_on DESC LIMIT 300`);
  const today = localDate();
  return (
    <Card title="Training records" icon={GraduationCap} actions={can && <Modal title="Record training" trigger="Record training" triggerClass="btn-accent btn-sm"><ActionForm action={trainingAction} className="space-y-3">
      <select name="staffId" className="input">{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select><input name="title" className="input" placeholder="Title" required />
      <select name="category" className="input">{["MANDATORY", "MR_SAFETY", "CPD", "EQUIPMENT", "OTHER"].map((t) => <option key={t} value={t}>{labelize(t)}</option>)}</select><input name="provider" className="input" placeholder="Provider" />
      <div className="grid grid-cols-3 gap-2"><div><label className="label">Completed</label><input type="date" name="completedOn" className="input" required /></div><div><label className="label">Expires</label><input type="date" name="expiresOn" className="input" /></div><div><label className="label">Hours</label><input type="number" step="0.5" name="hours" className="input" /></div></div>
      <SubmitButton>Save</SubmitButton></ActionForm></Modal>} bodyClass="p-0 overflow-x-auto">
      <table className="table text-xs"><thead><tr><th>Staff</th><th>Training</th><th>Category</th><th>Completed</th><th>Expires</th><th>Hours</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{r.full_name}</td><td>{r.title}<div className="text-slate-500">{r.provider}</div></td><td>{labelize(r.category)}</td><td>{fmtDate(r.c)}</td><td>{r.x ? <>{fmtDate(r.x)} {r.x < today && <Badge className="bg-red-50 text-red-700 ring-red-200">Expired</Badge>}</> : "—"}</td><td>{r.hours ?? "—"}</td></tr>)}</tbody></table>
    </Card>
  );
}
