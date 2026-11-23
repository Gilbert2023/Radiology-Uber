import { NextResponse, type NextRequest } from "next/server";
import { getActor } from "@/server/auth";
import { REPORTS } from "@/server/reports";
import { renderPdf, renderXlsx } from "@/server/render";
import { getHospital } from "@/server/settings";
import { q } from "@/lib/db";
import { audit } from "@/server/audit";
import { resolvePeriod } from "@/components/PeriodFilter";
import { fmtDateTime, isDateStr, localDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, { params }: { params: Promise<{ report: string }> }) {
  const a = await getActor();
  if (!a) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { report } = await params;
  const def = REPORTS[report];
  if (!def) return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  const selfServe = (report === "appointments" && a.permissions.has("appointments.view")) || (report === "appointment_audit" && (a.permissions.has("appointments.audit") || a.permissions.has("admin.audit")));
  if (!a.permissions.has("reports.export") && !selfServe || !def.perm.some((p) => a.permissions.has(p))) {
    await audit(undefined, a, "report.export_denied", "report", report);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  if (sp.to && isDateStr(sp.to)) { /* `to` from UI is exclusive; PeriodFilter expects inclusive */ const d = new Date(sp.to + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); sp.to = d.toISOString().slice(0, 10); }
  if (!a.permissions.has("patients.view")) sp.mask = "1"; // never put patient names in exports for non-clinical roles
  const p = resolvePeriod(sp);
  const format = sp.format === "pdf" ? "PDF" : "XLSX";
  const r = await def.build({ ...p, date: isDateStr(sp.date) ? sp.date : undefined, sp });
  const h = await getHospital();
  const meta = { generatedBy: `${a.fullName} (${a.roleName})`, generatedAt: fmtDateTime(new Date()), hospital: h?.name ?? "The Bank Hospital", department: h?.department ?? "Radiology – MRI Unit" };
  const buf = format === "PDF" ? await renderPdf(r, meta) : await renderXlsx(r, meta);
  await q(`INSERT INTO report_exports (report, format, params, user_id) VALUES ($1,$2,$3,$4)`, [report, format, JSON.stringify({ from: p.from, to: p.to, date: sp.date }), a.userId]);
  await audit(undefined, a, "report.export", "report", report, { format, from: p.from, to: p.to });
  const name = `TBH-MRI-${report}-${sp.date ?? p.from}${sp.date ? "" : `_to_${p.toIncl}`}.${format === "PDF" ? "pdf" : "xlsx"}`;
  return new NextResponse(new Uint8Array(buf), { headers: {
    "Content-Type": format === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
}
