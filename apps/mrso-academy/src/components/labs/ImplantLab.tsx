"use client";

import { useState } from "react";
import { progress } from "@/lib/progress";
import { Badge, Button } from "@/components/ui";
import { ScoreBanner } from "./LabShell";

type Decision = "proceed" | "modify" | "escalate";
const decisionLabel: Record<Decision, string> = {
  proceed: "Proceed — all conditions met as planned",
  modify: "Modify scanner/set-up/protocol so every condition is met, then proceed",
  escalate: "Do not proceed — not established as MR Conditional; escalate",
};

interface Cond {
  label: string;
  requirement: string;
  planned: string;
  met: boolean;
}
interface DeviceCase {
  id: string;
  device: string;
  context: string;
  conditions: Cond[];
  decision: Decision;
  why: string;
}

/** FICTIONAL devices and conditions, invented for training only. */
const deviceCases: DeviceCase[] = [
  {
    id: "a",
    device: "\"NeuroStim X2\" spinal cord stimulator system (fictional)",
    context: "Lumbar spine MRI booked on your 3 T scanner. Generator and leads confirmed from the implant record.",
    conditions: [
      { label: "Static field", requirement: "1.5 T only", planned: "3 T", met: false },
      { label: "RF transmit coil", requirement: "Body coil permitted", planned: "Body coil", met: true },
      { label: "RF exposure", requirement: "B1+rms ≤ 2.0 µT", planned: "Protocol max B1+rms 1.6 µT", met: true },
      { label: "Device state", requirement: "MRI mode enabled before scan", planned: "Patient remote available; MRI mode to be enabled", met: true },
    ],
    decision: "modify",
    why: "The 3 T system is outside the labelling. Rebook on a 1.5 T system where every condition can be met (and keep the other conditions).",
  },
  {
    id: "b",
    device: "\"FlowLine\" peripheral vascular stent (fictional)",
    context: "Pelvic MRI on 3 T. Stent model confirmed from the procedure report.",
    conditions: [
      { label: "Static field", requirement: "1.5 T or 3 T", planned: "3 T", met: true },
      { label: "Spatial field gradient", requirement: "≤ 20 T/m", planned: "≤ 4 T/m at patient-accessible positions (vendor map)", met: true },
      { label: "RF exposure", requirement: "Whole-body SAR ≤ 2 W/kg (Normal Operating Mode)", planned: "Normal Mode, max 1.7 W/kg", met: true },
      { label: "Scan time", requirement: "≤ 15 min continuous RF exposure", planned: "Longest sequence 6 min; total 25 min with pauses", met: true },
    ],
    decision: "proceed",
    why: "Every condition is met as planned. Document the check and monitor the patient as usual.",
  },
  {
    id: "c",
    device: "\"ClearSound 7\" cochlear implant (fictional)",
    context: "Brain MRI on 1.5 T. The implant card and audiology letter confirm the model; the magnet is in place.",
    conditions: [
      { label: "Static field", requirement: "1.5 T with magnet in place", planned: "1.5 T", met: true },
      { label: "Head bandage", requirement: "Compression bandage over implant site required", planned: "Not yet applied", met: false },
      { label: "RF transmit coil", requirement: "Body or head transmit coil", planned: "Body transmit, head receive", met: true },
      { label: "External processor", requirement: "Removed before Zone IV", planned: "Patient wearing processor", met: false },
    ],
    decision: "modify",
    why: "Apply the bandage per the manufacturer's instructions and remove the external processor; then every condition is met. Warn the patient about possible discomfort.",
  },
  {
    id: "d",
    device: "\"CardioPace MR\" pacemaker generator (fictional) — implanted abroad",
    context: "Cardiac MRI requested. Generator model confirmed from the device check. The lead model is not documented and the implanting centre cannot be contacted.",
    conditions: [
      { label: "System components", requirement: "Generator plus listed MR Conditional leads only", planned: "Lead model unknown", met: false },
      { label: "Static field", requirement: "1.5 T", planned: "1.5 T", met: true },
      { label: "Device programming", requirement: "MRI mode by trained staff", planned: "Device clinic available", met: true },
    ],
    decision: "escalate",
    why: "The system is not established as MR Conditional without lead identification. Escalate for specialist, documented risk–benefit decision under institutional policy.",
  },
];

export function ImplantLab() {
  const [idx, setIdx] = useState(0);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const c = deviceCases[idx];
  const caseScore = (dc: DeviceCase) =>
    dc.conditions.filter((cond, i) => marks[`${dc.id}-${i}`] === cond.met).length + (decisions[dc.id] === dc.decision ? 1 : 0);
  const caseTotal = (dc: DeviceCase) => dc.conditions.length + 1;
  const total = deviceCases.reduce((s, dc) => s + caseTotal(dc), 0);
  const score = deviceCases.reduce((s, dc) => s + caseScore(dc), 0);
  const ready = c.conditions.every((_, i) => marks[`${c.id}-${i}`] !== undefined) && decisions[c.id];
  const isChecked = !!checked[c.id];

  if (finished) {
    return (
      <div className="space-y-4">
        <ScoreBanner score={score} total={total}>
          Real devices: always use the current manufacturer labelling for the exact model and every component.
        </ScoreBanner>
        <Button onClick={() => { setIdx(0); setMarks({}); setDecisions({}); setChecked({}); setFinished(false); }}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Case {idx + 1} of {deviceCases.length}
        </p>
        <Badge tone="warn">Fictional device — conditions invented for training</Badge>
      </div>
      <div className="rounded-2xl border border-white/10 bg-navy-900/80 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">{c.device}</h2>
        <p className="mt-1 text-sm text-slate-300">{c.context}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Device conditions compared with the planned examination</caption>
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th scope="col" className="py-2 pr-3">Condition</th>
                <th scope="col" className="py-2 pr-3">Labelling requires</th>
                <th scope="col" className="py-2 pr-3">Planned</th>
                <th scope="col" className="py-2">Met?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {c.conditions.map((cond, i) => {
                const k = `${c.id}-${i}`;
                const ok = marks[k] === cond.met;
                return (
                  <tr key={k}>
                    <th scope="row" className="py-3 pr-3 font-medium text-white">{cond.label}</th>
                    <td className="py-3 pr-3 text-slate-300">{cond.requirement}</td>
                    <td className="py-3 pr-3 text-slate-300">{cond.planned}</td>
                    <td className="py-3">
                      <div className="flex gap-1" role="radiogroup" aria-label={`${cond.label}: met?`}>
                        {[true, false].map((v) => (
                          <button
                            key={String(v)}
                            type="button"
                            role="radio"
                            aria-checked={marks[k] === v}
                            disabled={isChecked}
                            onClick={() => setMarks((m) => ({ ...m, [k]: v }))}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${marks[k] === v ? (v ? "bg-safe-500 text-navy-950" : "bg-hazard-500 text-white") : "bg-white/10 text-slate-300"}`}
                          >
                            {v ? "Met" : "Not met"}
                          </button>
                        ))}
                      </div>
                      {isChecked && <p className={`mt-1 text-xs ${ok ? "text-safe-400" : "text-hazard-400"}`}>{ok ? "✓" : `✗ ${cond.met ? "Met" : "Not met"}`}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-white">Risk classification and decision</legend>
          <div className="mt-2 space-y-2">
            {(Object.keys(decisionLabel) as Decision[]).map((d) => (
              <label key={d} className="flex cursor-pointer gap-2 rounded-lg border border-white/10 p-2.5 text-sm text-slate-200 focus-within:ring-2 focus-within:ring-cyan-300 hover:bg-white/5">
                <input type="radio" name={`dec-${c.id}`} disabled={isChecked} checked={decisions[c.id] === d} onChange={() => setDecisions((x) => ({ ...x, [c.id]: d }))} className="mt-0.5 accent-cyan-400" />
                {decisionLabel[d]}
              </label>
            ))}
          </div>
        </fieldset>
        {isChecked && (
          <div role="status" className={`mt-4 rounded-xl border p-4 text-sm ${decisions[c.id] === c.decision ? "border-safe-500/40 bg-safe-500/10" : "border-hazard-500/40 bg-hazard-500/10"}`}>
            <p className="font-semibold text-white">
              {decisions[c.id] === c.decision ? "Correct decision" : `Best decision: ${decisionLabel[c.decision]}`}
            </p>
            <p className="mt-1 text-slate-200">{c.why}</p>
            <p className="mt-1 text-xs text-slate-400">Case score {caseScore(c)}/{caseTotal(c)}</p>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          {!isChecked ? (
            <Button onClick={() => setChecked((x) => ({ ...x, [c.id]: true }))} disabled={!ready}>
              Check case
            </Button>
          ) : idx < deviceCases.length - 1 ? (
            <Button onClick={() => setIdx(idx + 1)}>Next case</Button>
          ) : (
            <Button
              onClick={() => {
                setFinished(true);
                progress.recordLab("implant", score, total, "Implant Risk Assessment");
              }}
            >
              See results
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
