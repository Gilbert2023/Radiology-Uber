"use client";

import Link from "next/link";
import { useState } from "react";
import { PARAM_BY_ID } from "@/content/parameters";
import { VerificationBadge } from "@/components/ui";

/** Example values are illustrative teaching values, not copied from a patient study. */
const GROUPS: { title: string; fields: { label: string; id: string; example: string }[] }[] = [
  { title: "Scan Range / Geometry", fields: [
    { label: "Scan Plane", id: "scan-plane", example: "AXIAL" },
    { label: "Freq. DIR", id: "freq-direction", example: "A/P" },
    { label: "FOV", id: "freq-fov", example: "24.0" },
    { label: "Phase FOV", id: "phase-fov", example: "0.80" },
    { label: "No Phase Wrap", id: "npw", example: "Off" },
    { label: "Slice Thickness", id: "slice-thickness", example: "5.0" },
    { label: "Spacing", id: "spacing", example: "1.0" },
    { label: "Start / End", id: "start-end", example: "I45 / S95" },
    { label: "# of Slices", id: "num-slices", example: "24" },
  ] },
  { title: "Scan Timing", fields: [
    { label: "Chem Sat", id: "chem-sat", example: "None" },
    { label: "Auto TR", id: "auto-tr", example: "On" },
    { label: "TR", id: "tr", example: "4000" },
    { label: "# of TE per Scan", id: "num-te", example: "1" },
    { label: "TE", id: "te", example: "100" },
    { label: "Auto Refocus Flip Angle", id: "refocus-flip", example: "On" },
    { label: "Echo Train Length", id: "etl", example: "16" },
  ] },
  { title: "Acquisition / Resolution", fields: [
    { label: "Freq", id: "freq-matrix", example: "320" },
    { label: "Phase", id: "phase-matrix", example: "256" },
    { label: "NEX", id: "nex", example: "1.00" },
    { label: "Bandwidth", id: "bw", example: "±31.25" },
    { label: "Intensity Correction", id: "intensity-correction", example: "PURE" },
    { label: "Intensity Filter", id: "intensity-filter", example: "—" },
  ] },
  { title: "Advanced / System", fields: [
    { label: "Excitation Mode", id: "excitation-mode", example: "—" },
    { label: "Shim", id: "shim", example: "Auto" },
    { label: "RF Drive Mode", id: "rf-drive", example: "Preset" },
    { label: "Phase Correction", id: "phase-correction", example: "—" },
    { label: "Flow Comp. Direction", id: "flow-comp", example: "Slice" },
    { label: "Contrast", id: "contrast-options", example: "No" },
  ] },
  { title: "Information (read-only feedback)", fields: [
    { label: "Relative SNR", id: "relative-snr", example: "1.00" },
    { label: "Pixel Size", id: "pixel-size", example: "0.75 × 0.94" },
    { label: "Bandwidth/Pixel", id: "bw-per-pixel", example: "195 Hz" },
    { label: "Echo Spacing", id: "echo-spacing", example: "8.1 ms" },
    { label: "Min / Max TE", id: "min-max-te", example: "8 / 130" },
  ] },
];

export function ConsoleDiagram() {
  const [sel, setSel] = useState("bw");
  const p = PARAM_BY_ID[sel];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="overflow-hidden rounded-md border border-ink-700 bg-ink-900 text-[13px] text-paper-200">
        <div className="flex items-center justify-between border-b border-ink-700 px-3 py-2 font-mono text-xs">
          <span>Learning diagram · AX FRFSE T2</span>
          <span className="text-ink-400">illustrative values</span>
        </div>
        <div className="grid gap-px bg-ink-700 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <fieldset key={g.title} className="bg-ink-900 p-3">
              <legend className="mb-2 text-[11px] uppercase tracking-wider text-teal-100/70">{g.title}</legend>
              <div className="space-y-1">
                {g.fields.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSel(f.id)}
                    aria-pressed={sel === f.id}
                    className={`flex w-full items-center justify-between rounded-sm px-2 py-1 text-left ${sel === f.id ? "bg-teal-700 text-white" : "hover:bg-ink-700"}`}
                  >
                    <span>{f.label}</span>
                    <span className="font-mono text-xs opacity-80">{f.example}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="border-t border-ink-700 px-3 py-2 text-xs text-ink-400">SAR / B1+rms values are calculated by the scanner for the specific patient and system. This diagram deliberately shows none.</div>
      </div>
      {p && (
        <div className="panel panel-pad self-start lg:sticky lg:top-20" aria-live="polite">
          <div className="kicker mb-1">{p.group}</div>
          <h3 className="font-serif text-lg font-semibold">{p.label}</h3>
          <div className="my-2"><VerificationBadge v={p.verification} /></div>
          <p className="text-sm text-ink-700">{p.definition}</p>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>↑</strong> {p.increase}</p>
            <p><strong>↓</strong> {p.decrease}</p>
          </div>
          <Link href={`/parameters/${p.id}/`} className="btn-primary mt-4">Open full lesson</Link>
        </div>
      )}
    </div>
  );
}

const FAMILIES: { name: string; seq: string; note: string }[] = [
  { name: "Spin Echo", seq: "se", note: "Conventional SE — T1 workhorse." },
  { name: "Fast Spin Echo / FSE", seq: "fse", note: "FSE, FRFSE and variants." },
  { name: "PROPELLER", seq: "propeller", note: "Motion-robust radial blades." },
  { name: "SSFSE", seq: "ssfse", note: "Single-shot T2." },
  { name: "Gradient Echo", seq: "gre", note: "GRE, SPGR, FIESTA, 3D T1." },
  { name: "Vascular", seq: "tof", note: "TOF, PC, CE-MRA." },
  { name: "Spiral", seq: "", note: "Spiral k-space trajectories (e.g. some ASL implementations) — availability depends on release; verify." },
];

export function SequenceSelectDiagram() {
  return (
    <div className="panel panel-pad">
      <div className="kicker mb-3">Learning diagram · sequence families</div>
      <ul className="divide-y divide-paper-300">
        {FAMILIES.map((f) => (
          <li key={f.name} className="flex items-baseline justify-between gap-3 py-2">
            <div>
              <div className="font-medium text-ink-900">{f.name}</div>
              <div className="text-xs text-ink-500">{f.note}</div>
            </div>
            {f.seq ? <Link href={`/sequences/${f.seq}/`} className="shrink-0 text-sm">Library →</Link> : <span className="shrink-0 text-xs text-ink-400">No library page</span>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-500">Imaging options (e.g. Fast Recovery, IR Prep, T2 FLAIR, Tailored RF, ZIP, Square Pixel, Resp Trig, ASSET/ARC) appear depending on the selected family and licence. See the <Link href="/parameters/">Parameter Academy</Link>.</p>
    </div>
  );
}
