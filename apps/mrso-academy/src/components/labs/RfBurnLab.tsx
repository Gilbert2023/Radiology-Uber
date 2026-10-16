"use client";

import { useState } from "react";
import { progress } from "@/lib/progress";
import { Button } from "@/components/ui";
import { ScoreBanner } from "./LabShell";

interface Spot {
  id: number;
  x: number;
  y: number;
  label: string;
  hazard: boolean;
  why: string;
}

const spots: Spot[] = [
  { id: 1, x: 300, y: 215, label: "Hands clasped together over the abdomen", hazard: true, why: "Forms a closed conductive loop with a small contact point — classic burn mechanism." },
  { id: 2, x: 420, y: 205, label: "Inner thighs touching, no padding", hazard: true, why: "Skin-to-skin contact forms a loop; separate with pads." },
  { id: 3, x: 250, y: 108, label: "Left upper arm resting against the bore wall", hazard: true, why: "Skin contact with the bore places tissue close to the transmit coil." },
  { id: 4, x: 210, y: 190, label: "ECG lead looped on the chest", hazard: true, why: "Loops concentrate induced current; route straight, padded, away from the bore." },
  { id: 5, x: 520, y: 240, label: "Unused surface-coil cable lying across the shins", hazard: true, why: "Remove unused coils and cables from the bore." },
  { id: 6, x: 250, y: 300, label: "Right arm separated from bore and torso with manufacturer pads", hazard: false, why: "Correct padding." },
  { id: 7, x: 95, y: 205, label: "Earplugs and headphones fitted", hazard: false, why: "Hearing protection in place." },
  { id: 8, x: 470, y: 160, label: "Knee support cushion (department MR Safe label)", hazard: false, why: "Labelled positioning aid, used appropriately." },
  { id: 9, x: 170, y: 245, label: "Gown damp with sweat", hazard: true, why: "Moisture increases conductivity and burn risk. Dry the patient and change the gown." },
];

export function RfBurnLab() {
  const [flags, setFlags] = useState<Record<number, boolean>>({});
  const [checked, setChecked] = useState(false);
  const score = spots.filter((s) => !!flags[s.id] === s.hazard).length;

  const toggle = (id: number) => !checked && setFlags((f) => ({ ...f, [id]: !f[id] }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-300">
        A patient has been positioned for a 3 T abdominal scan with ECG gating. Select every <strong className="text-white">hazard</strong> — leave safe features
        unselected. Use the plan or the list.
      </p>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <svg viewBox="0 0 640 420" className="w-full rounded-2xl border border-white/10 bg-navy-950" role="group" aria-label="Top-down view of a patient positioned in the scanner bore">
          <rect x="30" y="60" width="580" height="300" rx="140" fill="#0f1d38" stroke="#334155" strokeWidth="3" />
          <text x="320" y="50" textAnchor="middle" fontSize="13" fill="#94a3b8">bore wall (transmit coil)</text>
          <rect x="60" y="130" width="540" height="160" rx="20" fill="#1e293b" />
          {/* head */}
          <circle cx="110" cy="210" r="34" fill="#475569" />
          {/* torso */}
          <rect x="150" y="150" width="210" height="120" rx="40" fill="#64748b" />
          {/* arms */}
          <path d="M175 150 C220 100 300 110 300 200" stroke="#94a3b8" strokeWidth="24" fill="none" strokeLinecap="round" />
          <path d="M175 272 C220 310 300 300 300 225" stroke="#94a3b8" strokeWidth="24" fill="none" strokeLinecap="round" />
          <rect x="230" y="296" width="60" height="14" rx="6" fill="#22d3ee" opacity="0.6" />
          {/* legs */}
          <rect x="360" y="170" width="230" height="36" rx="18" fill="#64748b" />
          <rect x="360" y="208" width="230" height="36" rx="18" fill="#64748b" />
          <rect x="440" y="150" width="60" height="16" rx="8" fill="#16a34a" opacity="0.7" />
          {/* ECG loop */}
          <path d="M190 180 c20 -20 40 20 20 25 c-25 6 -20 -25 5 -20 L250 170" stroke="#facc15" strokeWidth="3" fill="none" />
          {/* coil cable */}
          <path d="M470 250 C520 230 560 260 600 240" stroke="#f97316" strokeWidth="4" fill="none" />
          {/* sweat */}
          <path d="M170 240 q4 -10 8 0 a4 4 0 0 1 -8 0z" fill="#38bdf8" />
          {spots.map((s) => {
            const f = !!flags[s.id];
            const reveal = checked;
            const fill = reveal ? (s.hazard ? (f ? "#16a34a" : "#dc2626") : f ? "#dc2626" : "#16a34a") : f ? "#ef4444" : "#0b1328";
            return (
              <g
                key={s.id}
                role="checkbox"
                aria-checked={f}
                aria-label={`${s.id}. ${s.label}`}
                tabIndex={0}
                className="cursor-pointer focus:outline-none [&:focus>circle]:stroke-cyan-300"
                onClick={() => toggle(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(s.id);
                  }
                }}
              >
                <circle cx={s.x} cy={s.y} r="15" fill={fill} stroke="#e2e8f0" strokeWidth="2.5" />
                <text x={s.x} y={s.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff" pointerEvents="none">
                  {s.id}
                </text>
              </g>
            );
          })}
        </svg>
        <ul className="space-y-2">
          {spots.map((s) => {
            const f = !!flags[s.id];
            const ok = f === s.hazard;
            return (
              <li key={s.id} className={`rounded-xl border p-3 ${checked ? (ok ? "border-safe-500/40" : "border-hazard-500/40") : "border-white/10"}`}>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-200">
                  <input type="checkbox" checked={f} disabled={checked} onChange={() => toggle(s.id)} className="mt-0.5 h-4 w-4 accent-hazard-500" />
                  <span>
                    <span className="font-mono text-xs text-slate-500">{s.id}.</span> {s.label}
                  </span>
                </label>
                {checked && (
                  <p className={`mt-1 text-xs ${ok ? "text-safe-400" : "text-hazard-400"}`}>
                    {s.hazard ? "Hazard" : "Safe"} — {s.why}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {checked ? (
        <>
          <ScoreBanner score={score} total={spots.length}>Correctly classified features. Use the RF burn checklist from Module 5 at every set-up.</ScoreBanner>
          <Button onClick={() => { setFlags({}); setChecked(false); }}>Try again</Button>
        </>
      ) : (
        <Button onClick={() => { setChecked(true); progress.recordLab("rf-burn", score, spots.length, "RF Burn Positioning Check"); }}>Check positioning</Button>
      )}
    </div>
  );
}
