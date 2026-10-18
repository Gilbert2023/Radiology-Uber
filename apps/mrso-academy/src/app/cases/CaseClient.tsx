"use client";

import { useState } from "react";
import type { CaseStudy } from "@/content/types";
import { progress, useProgress } from "@/lib/progress";
import { Badge, Button } from "@/components/ui";

export function CaseViewedBadge({ id }: { id: string }) {
  const p = useProgress();
  return p.caseViewed[id] ? <Badge tone="safe">Worked</Badge> : null;
}

const steps: { key: keyof CaseStudy; title: string; tone?: "danger" | "safe" }[] = [
  { key: "concerns", title: "Initial safety concerns" },
  { key: "informationNeeded", title: "Information needed" },
  { key: "riskClassification", title: "Risk classification" },
  { key: "decisionProcess", title: "Decision-making process" },
  { key: "appropriateAction", title: "Appropriate action", tone: "safe" },
  { key: "avoid", title: "Actions to avoid", tone: "danger" },
  { key: "documentation", title: "Documentation requirements" },
  { key: "debrief", title: "Debrief and learning points" },
];

export function CaseWalkthrough({ c }: { c: CaseStudy }) {
  const [shown, setShown] = useState(0);
  const [notes, setNotes] = useState("");
  const all = shown >= steps.length;

  const reveal = (n: number) => {
    setShown(n);
    if (n >= steps.length) progress.viewCase(c.id, c.title);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
        <label htmlFor="notes" className="text-sm font-medium text-white">
          Your reasoning (optional — not saved)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What are the hazards? What do you need to know? Who decides?"
          className="mt-2 w-full rounded-xl border border-white/15 bg-navy-950 p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
      </div>
      <ol className="space-y-3">
        {steps.slice(0, shown).map((s) => {
          const v = c[s.key];
          return (
            <li
              key={s.key}
              className={`rounded-2xl border p-5 ${s.tone === "danger" ? "border-hazard-500/40 bg-hazard-500/5" : s.tone === "safe" ? "border-safe-500/40 bg-safe-500/5" : "border-white/10 bg-navy-900/70"}`}
            >
              <h3 className="font-semibold text-white">{s.title}</h3>
              {Array.isArray(v) ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {(v as string[]).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-300">{String(v)}</p>
              )}
            </li>
          );
        })}
      </ol>
      {!all ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => reveal(shown + 1)}>Reveal: {steps[shown].title}</Button>
          <Button variant="ghost" onClick={() => reveal(steps.length)}>
            Reveal all
          </Button>
        </div>
      ) : (
        <p role="status" className="text-sm text-safe-400">Case complete — recorded on your dashboard.</p>
      )}
    </div>
  );
}
