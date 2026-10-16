"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { progress } from "@/lib/progress";
import { Button } from "@/components/ui";
import { shuffle } from "@/lib/utils";
import { ScoreBanner } from "./LabShell";

const events = [
  "07:40 — Zone III door wedged open for trolley deliveries",
  "08:10 — Ward nurse brings an inpatient for MRI with an IV pump on a steel pole",
  "08:12 — Radiographer in Zone III is on the phone to the ward; does not see the nurse",
  "08:13 — Nurse pushes the IV pole through the open Zone IV door",
  "08:13 — Pole is pulled onto the bore cover; no one injured",
  "08:20 — Room secured; vendor called; incident reported",
];

const barriers = [
  { text: "Zone III physical access control (door wedged open)", failed: true },
  { text: "Zone IV door kept closed when not in active use", failed: true },
  { text: "Line of sight / gatekeeper supervision at Zone IV", failed: true },
  { text: "Ward staff MR safety awareness training", failed: true },
  { text: "Patient's written screening questionnaire", failed: false },
  { text: "Quench pipe integrity", failed: false },
];

const actions = [
  { text: "Self-closing, access-controlled Zone III door with alarm if held open; redesign delivery route", strength: 3 },
  { text: "Ferromagnetic detection system at Zone IV entrance as an adjunct", strength: 2 },
  { text: "Email reminding staff not to wedge doors", strength: 1 },
  { text: "Discipline the nurse", strength: 0 },
];

export function IncidentLab() {
  const [order, setOrder] = useState<number[]>(() => events.map((_, i) => i));
  // Shuffle after mount so server and client render the same initial markup.
  useEffect(() => setOrder(shuffle(events.map((_, i) => i))), []);
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [best, setBest] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const move = (pos: number, dir: -1 | 1) => {
    const n = [...order];
    const t = pos + dir;
    if (t < 0 || t >= n.length) return;
    [n[pos], n[t]] = [n[t], n[pos]];
    setOrder(n);
  };

  const timelineScore = order.filter((e, pos) => e === pos).length;
  const barrierScore = barriers.filter((b, i) => !!picked[i] === b.failed).length;
  const actionScore = best === 0 ? 2 : best === 1 ? 1 : 0;
  const total = events.length + barriers.length + 2;
  const score = timelineScore + barrierScore + actionScore;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
        <h2 className="font-semibold text-white">Incident summary</h2>
        <p className="mt-1 text-sm text-slate-300">
          A steel IV pole was pulled onto a 3 T magnet during a morning list. No injury occurred. You are the MRSO leading the investigation.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
        <h2 className="font-semibold text-white">Step 1 — Reconstruct the timeline</h2>
        <p className="text-sm text-slate-400">Use the arrow buttons to put events in chronological order.</p>
        <ol className="mt-3 space-y-2">
          {order.map((e, pos) => (
            <li key={e} className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${checked ? (e === pos ? "border-safe-500/40" : "border-hazard-500/40") : "border-white/10"}`}>
              <span className="w-5 text-center font-mono text-xs text-slate-500">{pos + 1}</span>
              <span className="flex-1 text-slate-200">{events[e]}</span>
              <Button variant="ghost" className="p-1.5" aria-label={`Move "${events[e]}" up`} disabled={checked || pos === 0} onClick={() => move(pos, -1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" className="p-1.5" aria-label={`Move "${events[e]}" down`} disabled={checked || pos === order.length - 1} onClick={() => move(pos, 1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
        <h2 className="font-semibold text-white">Step 2 — Which barriers failed?</h2>
        <ul className="mt-3 space-y-2">
          {barriers.map((b, i) => (
            <li key={b.text}>
              <label className={`flex cursor-pointer gap-2 rounded-lg border p-2.5 text-sm text-slate-200 focus-within:ring-2 focus-within:ring-cyan-300 ${checked ? (!!picked[i] === b.failed ? "border-safe-500/40" : "border-hazard-500/40") : "border-white/10 hover:bg-white/5"}`}>
                <input type="checkbox" disabled={checked} checked={!!picked[i]} onChange={() => setPicked((p) => ({ ...p, [i]: !p[i] }))} className="mt-0.5 accent-cyan-400" />
                {b.text}
                {checked && <span className="ml-auto text-xs text-slate-400">{b.failed ? "Failed" : "Not involved"}</span>}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
        <h2 className="font-semibold text-white">Step 3 — Choose the strongest corrective action</h2>
        <div className="mt-3 space-y-2">
          {actions.map((a, i) => (
            <label key={a.text} className="flex cursor-pointer gap-2 rounded-lg border border-white/10 p-2.5 text-sm text-slate-200 focus-within:ring-2 focus-within:ring-cyan-300 hover:bg-white/5">
              <input type="radio" name="capa" disabled={checked} checked={best === i} onChange={() => setBest(i)} className="mt-0.5 accent-cyan-400" />
              {a.text}
            </label>
          ))}
        </div>
        {checked && (
          <p className="mt-2 text-sm text-slate-300">
            Strongest: engineering out the failure (self-closing access-controlled door, workflow redesign). FMDS is a useful adjunct. Reminders are weak;
            blame does not fix the system.
          </p>
        )}
      </div>

      {checked ? (
        <>
          <ScoreBanner score={score} total={total}>
            Download the incident report and CAPA templates from the Resources library to practise documenting this investigation.
          </ScoreBanner>
          <Button onClick={() => { setOrder(shuffle(events.map((_, i) => i))); setPicked({}); setBest(null); setChecked(false); }}>Try again</Button>
        </>
      ) : (
        <Button disabled={best === null} onClick={() => { setChecked(true); progress.recordLab("incident", score, total, "Safety Incident Investigation"); }}>
          Submit investigation
        </Button>
      )}
    </div>
  );
}
