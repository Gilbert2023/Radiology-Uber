"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { labById } from "@/content/labs";
import { moduleById } from "@/content";
import { useProgress } from "@/lib/progress";
import { Badge, Callout } from "@/components/ui";

export function LabShell({ id, children }: { id: string; children: ReactNode }) {
  const lab = labById[id];
  const p = useProgress();
  const prior = p.labResults[id];
  const mod = moduleById[lab.moduleId];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="cyan">Interactive lab</Badge>
        <Link href={`/curriculum/${mod.id}/`} className="text-xs text-slate-400 hover:text-cyan-300">
          Linked to Module {mod.number}: {mod.title}
        </Link>
        {prior && <Badge tone="safe">Last result {prior.score}/{prior.total}</Badge>}
      </div>
      <Callout tone="warning" title="Educational simulation">
        Simplified for learning. It does not replace your local emergency procedures, approved MR safety policy, or manufacturer instructions for
        specific scanners and devices. Devices and values in labs are fictional or illustrative unless a source is cited.
      </Callout>
      {children}
    </div>
  );
}

export function ScoreBanner({ score, total, children }: { score: number; total: number; children?: ReactNode }) {
  const ratio = total ? score / total : 0;
  return (
    <div
      role="status"
      className={`rounded-2xl border p-5 ${ratio >= 0.8 ? "border-safe-500/40 bg-safe-500/10" : ratio >= 0.5 ? "border-caution-400/40 bg-caution-400/10" : "border-hazard-500/40 bg-hazard-500/10"}`}
    >
      <p className="text-lg font-semibold text-white">
        Result: {score} / {total}
      </p>
      {children && <div className="mt-1 text-sm text-slate-200">{children}</div>}
    </div>
  );
}
