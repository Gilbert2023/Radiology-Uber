"use client";

import { useState } from "react";
import { progress } from "@/lib/progress";
import { Badge, Button, Callout } from "@/components/ui";
import { ScoreBanner } from "./LabShell";

/**
 * Conceptual model only — relative units, not scanner values.
 *   B1+rms_rel ∝ (flip angle / 90°) × sqrt(RF duty)          (independent of patient size)
 *   SAR_rel    ∝ B1+rms_rel² × (B0 / 1.5 T)² × size factor   (frequency² scaling and body-size dependence)
 */
function model(b0: number, flip: number, duty: number, size: number) {
  const b1 = (flip / 90) * Math.sqrt(duty);
  const sar = b1 * b1 * (b0 / 1.5) ** 2 * size;
  return { b1, sar };
}

const questions = [
  {
    q: "With all else fixed, moving from 1.5 T to 3 T changes the illustrative SAR by roughly…",
    options: ["No change", "×2", "×4", "×0.5"],
    correct: 2,
    why: "Power deposition scales approximately with frequency squared: (3/1.5)² = 4. Real systems differ in coil design and pulse shape.",
  },
  {
    q: "A larger patient on the same protocol shows higher SAR but the same B1+rms in this model. What does this demonstrate?",
    options: [
      "SAR and B1+rms are interchangeable",
      "B1+rms describes the transmitted field; SAR is an absorbed-power estimate that depends on the patient — they are not interchangeable",
      "B1+rms is always more conservative",
    ],
    correct: 1,
    why: "Use whichever metric the device labelling specifies. Do not convert one into the other by rule of thumb.",
  },
  {
    q: "Which change most effectively lowers B1+rms for a sequence?",
    options: ["Increasing patient weight in the console", "Reducing flip angle or RF duty (e.g. longer TR, fewer slices per TR)", "Switching from 3 T to 1.5 T without changing the sequence"],
    correct: 1,
    why: "B1+rms depends on the transmitted RF — flip angle, pulse shape and duty cycle. Entering a false weight is unsafe and changes only the SAR estimate.",
  },
];

function Bar({ value, limit, label, unit }: { value: number; limit: number; label: string; unit: string }) {
    const max = limit * 2;
    return (
      <div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-200">{label}</span>
          <span className={value <= limit ? "text-safe-400" : "text-hazard-400"}>
            {value.toFixed(2)} {unit} {value <= limit ? "≤" : ">"} limit {limit}
          </span>
        </div>
        <div className="relative mt-1 h-4 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${label} ${value.toFixed(2)} of illustrative limit ${limit}`}>
          <div className={`h-full ${value <= limit ? "bg-safe-500" : "bg-hazard-500"}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
          <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: "50%" }} />
        </div>
      </div>
    );
}

function Slider({ id, label, min, max, step, value, set, fmt }: { id: string; label: string; min: number; max: number; step: number; value: number; set: (v: number) => void; fmt: (v: number) => string }) {
  return (
    <div>
      <label htmlFor={id} className="flex justify-between text-sm text-slate-200">
        <span>{label}</span>
        <span className="font-mono text-cyan-300">{fmt(value)}</span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="mt-2 w-full accent-cyan-400" />
    </div>
  );
}

export function RfSarLab() {
  const [b0, setB0] = useState(3);
  const [flip, setFlip] = useState(150);
  const [duty, setDuty] = useState(0.6);
  const [size, setSize] = useState(1);
  const [ans, setAns] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);

  const { b1, sar } = model(b0, flip, duty, size);
  const B1_LIMIT = 1.2; // illustrative device limit, relative units
  const SAR_LIMIT = 5; // illustrative scanner limit, relative units
  const b1ok = b1 <= B1_LIMIT;
  const sarok = sar <= SAR_LIMIT;
  const score = questions.filter((q, i) => ans[i] === q.correct).length;

  return (
    <div className="space-y-6">
      <Callout tone="info" title="Conceptual model — relative units">
        This explorer shows how quantities scale. It is not a SAR calculator and its numbers are not scanner values or real limits. Real SAR and B1+rms come
        from the scanner and apply against the exact labelling.
      </Callout>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-white/10 bg-navy-900/70 p-5">
          <fieldset>
            <legend className="text-sm text-slate-200">Field strength</legend>
            <div className="mt-2 flex gap-2">
              {[1.5, 3].map((v) => (
                <Button key={v} variant={b0 === v ? "primary" : "secondary"} aria-pressed={b0 === v} onClick={() => setB0(v)}>
                  {v} T
                </Button>
              ))}
            </div>
          </fieldset>
          <Slider id="flip" label="Refocusing flip angle" min={60} max={180} step={5} value={flip} set={setFlip} fmt={(v) => `${v}°`} />
          <Slider id="duty" label="RF duty (pulses per unit time)" min={0.1} max={1} step={0.05} value={duty} set={setDuty} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Slider id="size" label="Patient size factor" min={0.6} max={1.6} step={0.1} value={size} set={setSize} fmt={(v) => `×${v.toFixed(1)}`} />
        </div>
        <div className="space-y-5 rounded-2xl border border-white/10 bg-navy-900/70 p-5">
          <p className="text-sm text-slate-300">
            Larmor frequency: <span className="font-mono text-cyan-300">{(42.58 * b0).toFixed(1)} MHz</span>
          </p>
          <Bar value={b1} limit={B1_LIMIT} label="B1+rms (relative)" unit="" />
          <Bar value={sar} limit={SAR_LIMIT} label="Whole-body SAR (relative)" unit="" />
          <div className="flex flex-wrap gap-2">
            <Badge tone={b1ok ? "safe" : "danger"}>Fictional device B1+rms condition {b1ok ? "met" : "NOT met"}</Badge>
            <Badge tone={sarok ? "safe" : "danger"}>Illustrative SAR limit {sarok ? "met" : "exceeded"}</Badge>
          </div>
          {!b1ok && sarok && <p className="text-sm text-caution-400">Note: SAR is within its limit but the B1+rms condition is not met — the device condition still fails.</p>}
          <p className="text-xs text-slate-500">Try: reduce flip angle to 120° and duty to 60%, then change patient size and watch only SAR move.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
        <h2 className="font-semibold text-white">Check your understanding</h2>
        <ol className="mt-4 space-y-5">
          {questions.map((q, i) => (
            <li key={i}>
              <fieldset>
                <legend className="text-sm font-medium text-white">
                  {i + 1}. {q.q}
                </legend>
                <div className="mt-2 space-y-1.5">
                  {q.options.map((o, j) => (
                    <label key={j} className="flex cursor-pointer gap-2 rounded-lg border border-white/10 p-2.5 text-sm text-slate-200 focus-within:ring-2 focus-within:ring-cyan-300 hover:bg-white/5">
                      <input type="radio" name={`sq-${i}`} disabled={checked} checked={ans[i] === j} onChange={() => setAns((a) => ({ ...a, [i]: j }))} className="mt-0.5 accent-cyan-400" />
                      {o}
                    </label>
                  ))}
                </div>
                {checked && <p className={`mt-1 text-xs ${ans[i] === q.correct ? "text-safe-400" : "text-hazard-400"}`}>{ans[i] === q.correct ? "✓ " : `✗ Answer: ${q.options[q.correct]}. `}{q.why}</p>}
              </fieldset>
            </li>
          ))}
        </ol>
        {checked ? (
          <div className="mt-5 space-y-3">
            <ScoreBanner score={score} total={questions.length} />
            <Button onClick={() => { setAns({}); setChecked(false); }}>Try again</Button>
          </div>
        ) : (
          <Button className="mt-5" disabled={Object.keys(ans).length < questions.length} onClick={() => { setChecked(true); progress.recordLab("rf-sar", score, questions.length, "SAR and B1+rms Explorer"); }}>
            Check answers
          </Button>
        )}
      </div>
    </div>
  );
}
