"use client";

import Link from "next/link";
import { Clock, FlaskConical } from "lucide-react";
import { labs } from "@/content/labs";
import { moduleById } from "@/content";
import { useProgress } from "@/lib/progress";
import { Badge } from "@/components/ui";

export function LabIndex() {
  const p = useProgress();
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {labs.map((l) => {
        const r = p.labResults[l.id];
        return (
          <li key={l.id}>
            <Link
              href={`/lab/${l.id}/`}
              className="group flex h-full flex-col rounded-2xl border border-white/10 bg-navy-900/70 p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <div className="flex items-center justify-between">
                <FlaskConical className="h-5 w-5 text-cyan-300" aria-hidden />
                {r ? <Badge tone="safe">{r.score}/{r.total}</Badge> : <Badge>Not started</Badge>}
              </div>
              <p className="mt-3 font-semibold text-white group-hover:text-cyan-200">{l.title}</p>
              <p className="mt-1 flex-1 text-sm text-slate-400">{l.summary}</p>
              <p className="mt-4 flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" aria-hidden /> {l.minutes} min · Module {moduleById[l.moduleId].number}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
