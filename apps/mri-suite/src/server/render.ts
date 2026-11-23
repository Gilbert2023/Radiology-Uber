import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import type { Report } from "./reports";

const NAVY = "#2c3135", TEAL = "#df8500", GREY = "#64748b";
function logoFile(): string | null {
  for (const f of ["logo.png", "logo.jpg"]) { const p = path.join(process.cwd(), "public", "brand", f); if (fs.existsSync(p)) return p; }
  return null;
}

export async function renderPdf(r: Report, meta: { generatedBy: string; generatedAt: string; hospital: string; department: string }): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", layout: r.sections.some((s) => (s.table?.columns.length ?? 0) > 7) ? "landscape" : "portrait", margins: { top: 40, bottom: 50, left: 40, right: 40 }, bufferPages: true, info: { Title: r.title, Author: meta.hospital } });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));
  const W = doc.page.width - 80;
  const header = () => {
    const logo = logoFile();
    if (logo) doc.image(logo, 40, 30, { fit: [46, 46] });
    else { doc.save().dash(2, { space: 2 }).strokeColor("#b8862b").rect(40, 30, 46, 46).stroke().undash().restore(); doc.fontSize(6).fillColor("#8c6d2b").text("LOGO\nPENDING", 40, 46, { width: 46, align: "center" }); }
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(14).text(meta.hospital, 96, 32);
    doc.fillColor(TEAL).font("Helvetica").fontSize(9).text(`${meta.department} · MRI Suite Management System`, 96, 50);
    doc.moveTo(40, 84).lineTo(40 + W, 84).lineWidth(2).strokeColor(TEAL).stroke();
    doc.y = 94; doc.x = 40;
  };
  header();
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(16).text(r.title, 40, doc.y);
  doc.fillColor(GREY).font("Helvetica").fontSize(9).text(`${r.subtitle} · Generated ${meta.generatedAt} by ${meta.generatedBy}${r.confidential ? " · CONFIDENTIAL – contains patient information" : ""}`);
  doc.moveDown(0.8);
  const ensure = (h: number) => { if (doc.y + h > doc.page.height - 60) { doc.addPage(); header(); } };
  for (const s of r.sections) {
    ensure(60);
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text(s.heading, 40, doc.y);
    doc.moveTo(40, doc.y + 2).lineTo(40 + W, doc.y + 2).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
    doc.moveDown(0.5);
    if (s.note) { doc.fillColor(GREY).font("Helvetica-Oblique").fontSize(7.5).text(s.note, 40, doc.y, { width: W }); doc.moveDown(0.4); }
    if (s.kpis?.length) {
      const cols = 4, cw = W / cols;
      s.kpis.forEach(([k, v], i) => {
        if (i % cols === 0) { ensure(34); }
        const x = 40 + (i % cols) * cw, y = doc.y;
        doc.roundedRect(x + 2, y, cw - 4, 30, 3).fillColor("#fff7e0").fill();
        doc.fillColor(GREY).font("Helvetica").fontSize(6.5).text(k.toUpperCase(), x + 7, y + 4, { width: cw - 14, lineBreak: false, ellipsis: true });
        doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text(String(v ?? "—"), x + 7, y + 14, { width: cw - 14, lineBreak: false });
        doc.y = (i % cols === cols - 1 || i === s.kpis!.length - 1) ? y + 34 : y;
      });
      doc.moveDown(0.3);
    }
    if (s.table) {
      const { columns, rows } = s.table;
      const cw = W / columns.length;
      const fs = columns.length > 10 ? 6 : 7.5;
      const drawHead = () => { ensure(20); const y = doc.y; doc.rect(40, y, W, 14).fillColor(NAVY).fill(); columns.forEach((c, i) => doc.fillColor("#fff").font("Helvetica-Bold").fontSize(fs).text(c, 42 + i * cw, y + 4, { width: cw - 4, lineBreak: false, ellipsis: true })); doc.y = y + 14; };
      drawHead();
      if (!rows.length) { doc.fillColor(GREY).font("Helvetica").fontSize(8).text("No records.", 42, doc.y + 3); doc.moveDown(); }
      rows.forEach((row, ri) => {
        doc.font("Helvetica").fontSize(fs);
        const h = Math.max(12, ...row.map((c) => doc.heightOfString(String(c ?? ""), { width: cw - 4 }) + 4));
        if (doc.y + h > doc.page.height - 60) { doc.addPage(); header(); drawHead(); }
        const y = doc.y;
        if (ri % 2) doc.rect(40, y, W, h).fillColor("#f8fafc").fill();
        row.forEach((c, i) => doc.fillColor("#1f2326").font("Helvetica").fontSize(fs).text(String(c ?? "—"), 42 + i * cw, y + 2, { width: cw - 4 }));
        doc.y = y + h;
      });
      doc.moveDown(0.8);
    }
    doc.moveDown(0.4);
  }
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(GREY).font("Helvetica").fontSize(7).text(`${meta.hospital} · ${r.title} · Page ${i + 1} of ${range.count}${r.confidential ? " · CONFIDENTIAL" : ""} · Times: Africa/Accra`, 40, doc.page.height - 35, { width: W, align: "center", lineBreak: false });
  }
  doc.end();
  return done;
}

export async function renderXlsx(r: Report, meta: { generatedBy: string; generatedAt: string; hospital: string; department: string }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = meta.hospital; wb.created = new Date();
  const sheetName = (h: string, i: number) => `${i + 1} ${h}`.replace(/[\\/?*[\]:]/g, "").slice(0, 31);
  const summary = wb.addWorksheet("Summary");
  summary.addRow([meta.hospital]).font = { bold: true, size: 14, color: { argb: "FF2C3135" } };
  summary.addRow([`${meta.department} · MRI Suite Management System`]).font = { color: { argb: "FFB05A02" } };
  summary.addRow([r.title]).font = { bold: true, size: 12 };
  summary.addRow([r.subtitle]);
  summary.addRow([`Generated ${meta.generatedAt} by ${meta.generatedBy}${r.confidential ? " · CONFIDENTIAL" : ""}`]).font = { italic: true, color: { argb: "FF64748B" } };
  summary.addRow([]);
  summary.getColumn(1).width = 46; summary.getColumn(2).width = 22;
  r.sections.forEach((s, i) => {
    if (s.kpis?.length) {
      summary.addRow([s.heading]).font = { bold: true, color: { argb: "FF2C3135" } };
      for (const [k, v] of s.kpis) summary.addRow([k, v]);
      if (s.note) summary.addRow([s.note]).font = { italic: true, size: 9 };
      summary.addRow([]);
    }
    if (s.table) {
      const ws = wb.addWorksheet(sheetName(s.heading, i));
      ws.addRow([`${meta.hospital} – ${r.title}`]).font = { bold: true, color: { argb: "FF2C3135" } };
      ws.addRow([`${s.heading} · ${r.subtitle}`]);
      if (s.note) ws.addRow([s.note]).font = { italic: true, size: 9 };
      ws.addRow([]);
      const head = ws.addRow(s.table.columns);
      head.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C3135" } }; });
      for (const row of s.table.rows) ws.addRow(row.map((c) => (c === null || c === undefined ? "" : c)));
      s.table.columns.forEach((c, ci) => { ws.getColumn(ci + 1).width = Math.min(40, Math.max(12, c.length + 4, ...s.table!.rows.slice(0, 200).map((r) => String(r[ci] ?? "").length + 2))); });
      ws.views = [{ state: "frozen", ySplit: head.number }];
    }
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
