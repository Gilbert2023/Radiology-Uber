"use client";

import { useProgress } from "@/lib/progress";
import { computeStats } from "@/lib/stats";
import { formatDuration } from "@/lib/utils";
import { Card, ProgressBar } from "@/components/ui";
import { Ring } from "@/components/charts";

export function DashboardPreview() {
  const s = useProgress();
  const st = computeStats(s);
  return (
    <Card className="bg-gradient-to-br from-navy-800/90 to-navy-900/90">
      <div className="flex items-center gap-5">
        <Ring value={st.overall} label="Overall completion" size={96} />
        <div>
          <p className="text-sm text-slate-400">Overall completion</p>
          <p className="text-2xl font-bold text-white">{st.overall}%</p>
          <p className="text-xs text-slate-400">
            {st.lessonsDone}/{st.lessonsTotal} lessons · {st.labsDone}/{st.labsTotal} labs · {formatDuration(s.learningSeconds)} learning
          </p>
        </div>
      </div>
      <ul className="mt-6 space-y-3">
        {st.moduleStatus.slice(0, 5).map((m) => (
          <li key={m.module.id}>
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">
                {m.module.number}. {m.module.title}
              </span>
              <span className="text-slate-400">{m.pct}%</span>
            </div>
            <ProgressBar value={m.pct} label={`${m.module.title} progress`} className="mt-1" />
          </li>
        ))}
      </ul>
      {st.next && (
        <p className="mt-5 rounded-lg bg-cyan-400/10 p-3 text-xs text-cyan-200">
          Recommended next: <span className="font-semibold">{st.next.lesson.title}</span>
        </p>
      )}
    </Card>
  );
}
