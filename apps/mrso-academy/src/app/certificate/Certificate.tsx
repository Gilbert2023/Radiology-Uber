"use client";

import { Printer } from "lucide-react";
import { progress, useProgress, CAPSTONE_PASS_MARK } from "@/lib/progress";
import { computeStats } from "@/lib/stats";
import { formatDate, pct } from "@/lib/utils";
import { Button, Callout, EmptyState, LinkButton } from "@/components/ui";
import { SafetySign } from "@/components/art/SafetySign";

export function Certificate() {
  const p = useProgress();
  const st = computeStats(p);

  if (!st.certificateEarned) {
    return (
      <EmptyState
        title="Completion record not yet earned"
        action={<LinkButton href="/dashboard/">View requirements on your dashboard</LinkButton>}
      >
        Complete all {st.lessonsTotal} lessons ({st.lessonsDone} done) and score at least {CAPSTONE_PASS_MARK * 100}% on the capstone
        {st.best ? ` (best so far ${pct(st.best.correct, st.best.total)}%)` : ""}.
      </EmptyState>
    );
  }

  const best = st.best!;
  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-300">
          Name to display
          <input
            value={p.learnerName}
            onChange={(e) => progress.setLearnerName(e.target.value)}
            placeholder="Your name"
            className="mt-1 block rounded-lg border border-white/15 bg-navy-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </label>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden /> Print / save as PDF
        </Button>
      </div>
      <div className="no-print">
        <Callout tone="warning" title="What this record is — and is not">
          It records completion of this educational course in this browser only (local demonstration). It is not an accreditation, licence, CPD approval or
          an externally recognised MRSO credential, and it cannot be verified by a third party.
        </Callout>
      </div>
      <article className="mx-auto max-w-3xl rounded-3xl border-4 border-double border-cyan-400/60 bg-gradient-to-br from-navy-800 to-navy-950 p-10 text-center print:border-black print:bg-white print:text-black">
        <div className="flex justify-center">
          <SafetySign kind="magnetic-field" size={64} />
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-cyan-300 print:text-black">Advanced MRI Safety Officer Academy</p>
        <h1 className="mt-3 text-3xl font-bold text-white print:text-black">Course Completion Record</h1>
        <p className="mt-6 text-slate-300 print:text-black">This records that</p>
        <p className="mt-2 text-2xl font-semibold text-white print:text-black">{p.learnerName || "—"}</p>
        <p className="mt-4 text-slate-300 print:text-black">
          completed all {st.lessonsTotal} lessons of the online course and achieved {pct(best.correct, best.total)}% in the capstone assessment on{" "}
          {formatDate(best.date)}.
        </p>
        <p className="mt-8 text-xs text-slate-400 print:text-black">
          Educational course completion only. Not an accreditation or externally recognised MR safety credential. Self-recorded in a local demonstration; not
          independently verified.
        </p>
      </article>
    </div>
  );
}
