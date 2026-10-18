"use client";

import { useState } from "react";
import { progress } from "@/lib/progress";
import { Button } from "@/components/ui";
import { SafetySign, type SignKind } from "@/components/art/SafetySign";
import { ScoreBanner } from "./LabShell";

type Decision = "allow" | "verify" | "keepout";
const labels: Record<Decision, string> = {
  allow: "Allow into Zone IV (conditions met)",
  verify: "Stop at Zone III — verify labelling first",
  keepout: "Keep out of Zone IV",
};

interface Item {
  name: string;
  detail: string;
  sign?: SignKind;
  accept: Decision[];
  why: string;
}

const items: Item[] = [
  { name: "Positioning wedge", detail: "Foam wedge from the MR department, permanent green MR Safe label.", sign: "mr-safe", accept: ["allow"], why: "Verified MR Safe labelling on department equipment." },
  { name: "Standard ward wheelchair", detail: "Steel frame, no MR label, brought by a porter.", accept: ["keepout"], why: "Unlabelled steel wheelchair — classic projectile. Transfer the patient to MR Conditional equipment." },
  { name: "Oxygen cylinder", detail: "Aluminium cylinder with 'MRI' handwritten in marker; regulator looks standard.", accept: ["verify", "keepout"], why: "Handwritten marks are not labelling and regulators may be ferromagnetic. Use a properly labelled MR Conditional cylinder." },
  { name: "Department patient monitor", detail: "On the Zone IV inventory, labelled MR Conditional for your scanner; must stay behind the marked floor line.", sign: "mr-conditional", accept: ["allow"], why: "MR Conditional with known conditions that will be met (respect the floor line)." },
  { name: "Contractor toolbox", detail: "Steel toolbox with screwdrivers and pliers.", accept: ["keepout"], why: "Ferromagnetic tools — use controlled MR Conditional tools under permit-to-work." },
  { name: "Physio sandbag", detail: "Fabric bag; contents unknown (may be iron shot).", accept: ["verify", "keepout"], why: "Sandbags can contain iron shot. Use department-labelled MR Safe positioning aids." },
  { name: "Infusion pump", detail: "Ward pump attached to the patient; no MR label.", accept: ["keepout"], why: "Unlabelled pumps are MR Unsafe by default. Switch to an MR Conditional pump or long-line setup per policy." },
  { name: "'Non-magnetic' scissors", detail: "Nurse says they are titanium; no label.", accept: ["verify", "keepout"], why: "Never classify by assumed material. Without verified labelling, keep out." },
  { name: "Fire extinguisher", detail: "On the Zone IV inventory, labelled MR Conditional, mounted beside the door.", sign: "mr-conditional", accept: ["allow"], why: "MR Conditional extinguisher intended for Zone IV use." },
  { name: "Floor polisher", detail: "Out-of-hours cleaning; steel body and motor.", accept: ["keepout"], why: "Large ferromagnetic object — major projectile risk." },
];

export function ProjectileLab() {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Decision[]>([]);
  const [current, setCurrent] = useState<Decision | null>(null);
  const done = answers.length === items.length;
  const score = answers.filter((a, idx) => items[idx].accept.includes(a)).length;

  const confirm = () => {
    if (!current) return;
    const next = [...answers, current];
    setAnswers(next);
    setCurrent(null);
    if (next.length === items.length) {
      progress.recordLab("projectile", next.filter((a, idx) => items[idx].accept.includes(a)).length, items.length, "Projectile Risk Identification");
    } else setI(i + 1);
  };

  if (done) {
    return (
      <div className="space-y-6">
        <ScoreBanner score={score} total={items.length}>
          Remember: classification depends on verified labelling, never appearance or assumed material.
        </ScoreBanner>
        <ul className="space-y-2">
          {items.map((it, idx) => {
            const ok = it.accept.includes(answers[idx]);
            return (
              <li key={it.name} className={`rounded-xl border p-3 text-sm ${ok ? "border-safe-500/40" : "border-hazard-500/40"}`}>
                <p className="font-medium text-white">
                  {ok ? "✓" : "✗"} {it.name}
                </p>
                <p className="text-slate-400">You: {labels[answers[idx]]} · Accepted: {it.accept.map((a) => labels[a]).join(" or ")}</p>
                <p className="mt-1 text-slate-300">{it.why}</p>
              </li>
            );
          })}
        </ul>
        <Button onClick={() => { setI(0); setAnswers([]); }}>Try again</Button>
      </div>
    );
  }

  const it = items[i];
  const last = answers.length > 0 ? items[answers.length - 1] : null;
  const lastOk = last ? last.accept.includes(answers[answers.length - 1]) : null;

  return (
    <div className="space-y-4">
      {last && (
        <p role="status" className={`rounded-xl border p-3 text-sm ${lastOk ? "border-safe-500/40 bg-safe-500/10" : "border-hazard-500/40 bg-hazard-500/10"}`}>
          <span className="font-semibold text-white">{lastOk ? "✓ " : "✗ "}{last.name}:</span> <span className="text-slate-200">{last.why}</span>
        </p>
      )}
      <div className="rounded-2xl border border-white/10 bg-navy-900/80 p-6">
        <p className="text-sm text-slate-400">
          Item {i + 1} of {items.length} arriving at the Zone III door
        </p>
        <div className="mt-3 flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white/5">
            {it.sign ? <SafetySign kind={it.sign} size={56} /> : <span className="text-xs text-slate-500">No label</span>}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{it.name}</h2>
            <p className="mt-1 text-slate-300">{it.detail}</p>
          </div>
        </div>
        <fieldset className="mt-5">
          <legend className="sr-only">Your decision</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(labels) as Decision[]).map((d) => (
              <label key={d} className={`cursor-pointer rounded-xl border p-3 text-sm focus-within:ring-2 focus-within:ring-cyan-300 ${current === d ? "border-cyan-400 bg-cyan-400/10 text-white" : "border-white/10 text-slate-200 hover:bg-white/5"}`}>
                <input type="radio" name="decision" className="sr-only" checked={current === d} onChange={() => setCurrent(d)} />
                {labels[d]}
              </label>
            ))}
          </div>
        </fieldset>
        <Button className="mt-4" onClick={confirm} disabled={!current}>
          Confirm decision
        </Button>
      </div>
    </div>
  );
}
