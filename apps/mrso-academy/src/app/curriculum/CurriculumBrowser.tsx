"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bookmark, CheckCircle2, ChevronDown, Circle, FlaskConical, Search } from "lucide-react";
import { modules } from "@/content";
import { labById } from "@/content/labs";
import { useProgress } from "@/lib/progress";
import { Badge, EmptyState, ProgressBar } from "@/components/ui";
import { cn, pct } from "@/lib/utils";

function lessonText(l: (typeof modules)[number]["lessons"][number]) {
  return [l.title, l.summary, ...l.objectives, ...l.sections.flatMap((s) => [s.heading, ...s.body, ...(s.bullets ?? [])]), ...l.mistakes]
    .join(" ")
    .toLowerCase();
}

export function CurriculumBrowser() {
  const p = useProgress();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ m1: true });
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return modules.map((m) => ({ m, lessons: m.lessons }));
    return modules
      .map((m) => ({
        m,
        lessons: m.lessons.filter((l) => lessonText(l).includes(q) || m.title.toLowerCase().includes(q)),
      }))
      .filter((x) => x.lessons.length > 0);
  }, [q]);

  return (
    <div>
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <label htmlFor="cur-search" className="sr-only">Search the curriculum</label>
        <input
          id="cur-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lessons — e.g. B1+rms, aneurysm clip, quench pipe"
          className="w-full rounded-xl border border-white/15 bg-navy-900 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
        />
      </div>
      {q && (
        <p className="mt-3 text-sm text-slate-400" aria-live="polite">
          {filtered.reduce((s, x) => s + x.lessons.length, 0)} lesson(s) match &ldquo;{query}&rdquo;
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No lessons match your search">Try a broader term, or check the glossary.</EmptyState>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {filtered.map(({ m, lessons }) => {
            const keys = m.lessons.map((l) => `${m.id}/${l.id}`);
            const done = keys.filter((k) => p.completedLessons[k]).length;
            const isOpen = !!q || !!open[m.id];
            return (
              <li key={m.id} className="overflow-hidden rounded-2xl border border-white/10 bg-navy-900/70">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`mod-${m.id}`}
                  onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}
                  className="flex w-full items-center gap-4 p-5 text-left hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 font-mono text-lg font-bold text-cyan-300">
                    {String(m.number).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{m.title}</span>
                      <Badge>{m.topic}</Badge>
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-400">{m.tagline}</span>
                    <ProgressBar value={pct(done, keys.length)} label={`${m.title} completion`} className="mt-2 max-w-xs" />
                  </span>
                  <span className="hidden text-right text-xs text-slate-400 sm:block">
                    {done}/{keys.length} lessons
                  </span>
                  <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition", isOpen && "rotate-180")} aria-hidden />
                </button>
                {isOpen && (
                  <div id={`mod-${m.id}`} className="border-t border-white/10 px-5 pb-5">
                    <p className="pt-4 text-sm text-slate-300">{m.description}</p>
                    <ul className="mt-4 divide-y divide-white/5">
                      {lessons.map((l) => {
                        const key = `${m.id}/${l.id}`;
                        const complete = !!p.completedLessons[key];
                        return (
                          <li key={l.id}>
                            <Link href={`/curriculum/${m.id}/${l.id}/`} className="flex items-center gap-3 py-3 hover:text-cyan-200">
                              {complete ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-safe-400" aria-label="Completed" />
                              ) : (
                                <Circle className="h-5 w-5 shrink-0 text-slate-600" aria-label="Not completed" />
                              )}
                              <span className="flex-1 text-sm text-slate-100">{l.title}</span>
                              {p.bookmarks.includes(key) && <Bookmark className="h-4 w-4 fill-cyan-300 text-cyan-300" aria-label="Bookmarked" />}
                              <span className="text-xs text-slate-500">{l.minutes} min</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/curriculum/${m.id}/`} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5">
                        Module overview
                      </Link>
                      {m.labIds?.map((id) => (
                        <Link key={id} href={`/lab/${id}/`} className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-400/10">
                          <FlaskConical className="h-3.5 w-3.5" aria-hidden /> {labById[id]?.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
