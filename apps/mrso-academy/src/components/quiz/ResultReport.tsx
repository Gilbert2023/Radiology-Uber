"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Question } from "@/content/types";
import { modules } from "@/content";
import { Badge, Button, Card } from "@/components/ui";
import { BarList, Ring } from "@/components/charts";
import { formatDuration, pct } from "@/lib/utils";
import { isCorrect, type QuizResult } from "./QuizRunner";

export function ResultReport({
  result,
  questions,
  passMark,
  onRetry,
  extra,
}: {
  result: QuizResult;
  questions: Question[];
  passMark?: number;
  onRetry?: () => void;
  extra?: React.ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  const score = pct(result.correct, result.total);
  const passed = passMark !== undefined ? score >= passMark * 100 : undefined;
  const topics = Object.entries(result.byTopic)
    .map(([t, v]) => ({ label: t, value: pct(v.correct, v.total), detail: `${v.correct}/${v.total}` }))
    .sort((a, b) => a.value - b.value);
  const weak = topics.filter((t) => t.value < 75);
  const review = questions.filter((q) => showAll || result.wrongIds.includes(q.id));

  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-center gap-6 sm:flex-row">
        <Ring value={score} label="Score" size={130} />
        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm uppercase tracking-wider text-slate-400">Score report</p>
          <p className="text-3xl font-bold text-white">
            {result.correct} / {result.total} correct
          </p>
          <p className="mt-1 text-sm text-slate-400">Time taken: {formatDuration(result.durationSec)}</p>
          {passed !== undefined && (
            <div className="mt-3">
              {passed ? <Badge tone="safe">Met the {Math.round(passMark! * 100)}% criterion</Badge> : <Badge tone="danger">Below the {Math.round(passMark! * 100)}% criterion</Badge>}
            </div>
          )}
          {extra}
        </div>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            New attempt
          </Button>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-white">Performance by topic</h3>
          <div className="mt-4">
            <BarList data={topics} emptyText="No topics." />
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-white">Recommended revision</h3>
          {weak.length === 0 ? (
            <p className="mt-3 text-sm text-slate-300">No topic below 75% in this attempt. Keep consolidating with the case studies and flashcards.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {weak.map((w) => {
                const mods = modules.filter((m) => m.topic === w.label);
                return (
                  <li key={w.label} className="rounded-lg bg-white/5 p-3 text-sm">
                    <p className="font-medium text-white">
                      {w.label} — {w.value}%
                    </p>
                    <p className="mt-1 text-slate-400">
                      Revise:{" "}
                      {mods.length
                        ? mods.map((m, idx) => (
                            <span key={m.id}>
                              {idx > 0 && ", "}
                              <Link className="text-cyan-300 underline-offset-2 hover:underline" href={`/curriculum/${m.id}/`}>
                                Module {m.number}: {m.title}
                              </Link>
                            </span>
                          ))
                        : "the case studies library"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-white">{showAll ? "All questions" : `Review incorrect answers (${result.wrongIds.length})`}</h3>
          <Button variant="ghost" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show incorrect only" : "Show all questions"}
          </Button>
        </div>
        {review.length === 0 ? (
          <p className="mt-3 text-sm text-slate-300">Every question was answered correctly.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {review.map((q) => {
              const sel = result.answers[q.id] ?? [];
              const ok = isCorrect(q, sel);
              return (
                <li key={q.id} className="rounded-xl border border-white/10 p-4">
                  <div className="flex items-start gap-2">
                    {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-safe-400" aria-label="Correct" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-hazard-400" aria-label="Incorrect" />}
                    <div className="flex-1">
                      {q.scenario && <p className="mb-2 text-sm italic text-slate-400">{q.scenario}</p>}
                      <p className="font-medium text-white">{q.stem}</p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {q.options.map((o, idx) => (
                          <li
                            key={idx}
                            className={
                              q.correct.includes(idx) ? "text-safe-400" : sel.includes(idx) ? "text-hazard-400 line-through" : "text-slate-400"
                            }
                          >
                            {q.correct.includes(idx) ? "✓ " : sel.includes(idx) ? "✗ " : "• "}
                            {o}
                          </li>
                        ))}
                      </ul>
                      {sel.length === 0 && <p className="mt-1 text-xs text-caution-400">Not answered</p>}
                      <p className="mt-3 rounded-lg bg-white/5 p-3 text-sm text-slate-200">{q.explanation}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
