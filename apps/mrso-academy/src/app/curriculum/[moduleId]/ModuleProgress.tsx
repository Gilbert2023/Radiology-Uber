"use client";

import { moduleById } from "@/content";
import { useProgress } from "@/lib/progress";
import { ProgressBar } from "@/components/ui";
import { pct } from "@/lib/utils";

export function ModuleProgress({ moduleId }: { moduleId: string }) {
  const p = useProgress();
  const m = moduleById[moduleId];
  const done = m.lessons.filter((l) => p.completedLessons[`${m.id}/${l.id}`]).length;
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-4">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">Module progress</span>
        <span className="text-slate-400">
          {done}/{m.lessons.length} lessons
        </span>
      </div>
      <ProgressBar value={pct(done, m.lessons.length)} label="Module progress" className="mt-2" />
    </div>
  );
}
