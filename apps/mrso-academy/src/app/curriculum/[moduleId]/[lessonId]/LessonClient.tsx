"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, CheckCircle2, Download, RotateCcw } from "lucide-react";
import { questionById } from "@/content";
import { progress, useProgress } from "@/lib/progress";
import { Button } from "@/components/ui";
import { QuizRunner, type QuizResult } from "@/components/quiz/QuizRunner";
import { downloadText, pct } from "@/lib/utils";

export function LessonActions({ lessonKey, label, href }: { lessonKey: string; label: string; href: string }) {
  const p = useProgress();
  const done = !!p.completedLessons[lessonKey];
  const marked = p.bookmarks.includes(lessonKey);
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={marked ? "primary" : "secondary"} aria-pressed={marked} onClick={() => progress.toggleBookmark(lessonKey)}>
        <Bookmark className={marked ? "h-4 w-4 fill-navy-950" : "h-4 w-4"} aria-hidden />
        {marked ? "Bookmarked" : "Bookmark"}
      </Button>
      {done ? (
        <Button variant="secondary" onClick={() => progress.uncompleteLesson(lessonKey)} title="Mark as not complete">
          <CheckCircle2 className="h-4 w-4 text-safe-400" aria-hidden /> Completed
        </Button>
      ) : (
        <Button onClick={() => progress.completeLesson(lessonKey, label, href)}>
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Mark as complete
        </Button>
      )}
    </div>
  );
}

/** Accrues learning time while the lesson tab is visible. */
export function LessonTimer() {
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") progress.addLearningSeconds(15);
    }, 15000);
    return () => clearInterval(id);
  }, []);
  return null;
}

export function KnowledgeCheck({ lessonKey, label, href, questionIds }: { lessonKey: string; label: string; href: string; questionIds: string[] }) {
  const p = useProgress();
  const qs = useMemo(() => questionIds.map((id) => questionById[id]).filter(Boolean), [questionIds]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [run, setRun] = useState(0);
  const prior = p.lessonQuiz[lessonKey];

  if (qs.length === 0) return <p className="text-sm text-slate-400">No knowledge-check questions are attached to this lesson yet.</p>;

  if (result) {
    const score = pct(result.correct, result.total);
    return (
      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5" role="status">
        <p className="text-lg font-semibold text-white">
          You scored {result.correct}/{result.total} ({score}%)
        </p>
        <p className="mt-1 text-sm text-slate-300">
          {score === 100 ? "Excellent." : "Use Try again to review the explanations, and revisit the sections you found difficult."}
          {" "}This lesson is now marked complete.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => { setResult(null); setRun((r) => r + 1); }}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {prior && (
        <p className="mb-3 text-sm text-slate-400">
          Previous score: {prior.correct}/{prior.total}
        </p>
      )}
      <QuizRunner
        key={run}
        questions={qs}
        feedback="immediate"
        onComplete={(r) => {
          setResult(r);
          progress.recordLessonQuiz(lessonKey, r.correct, r.total, label, href);
          progress.completeLesson(lessonKey, label, href);
        }}
      />
    </div>
  );
}

export function ChecklistDownload({ title, items }: { title: string; items: string[] }) {
  return (
    <Button
      variant="secondary"
      onClick={() =>
        downloadText(
          `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-checklist.txt`,
          `${title.toUpperCase()}\nAdvanced MRI Safety Officer Academy — educational checklist. Adapt to and approve under local policy before use.\n\n${items
            .map((i) => `[ ] ${i}`)
            .join("\n")}\n\nCompleted by: ____________________  Date/time: ______________\n`,
        )
      }
    >
      <Download className="h-4 w-4" aria-hidden /> Download checklist
    </Button>
  );
}
