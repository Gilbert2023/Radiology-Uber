"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Flag, XCircle } from "lucide-react";
import type { Question } from "@/content/types";
import { referenceById } from "@/content/references";
import { Badge, Button } from "@/components/ui";
import { cn, shuffle } from "@/lib/utils";

export interface QuizResult {
  correct: number;
  total: number;
  durationSec: number;
  byTopic: Record<string, { correct: number; total: number }>;
  wrongIds: string[];
  answers: Record<string, number[]>;
}

const typeLabel: Record<Question["type"], string> = {
  mcq: "Multiple choice",
  multi: "Select all that apply",
  truefalse: "True / false",
  scenario: "Clinical scenario",
};

export function isCorrect(q: Question, selected: number[] = []) {
  if (selected.length !== q.correct.length) return false;
  const s = new Set(selected);
  return q.correct.every((c) => s.has(c));
}

export function scoreQuiz(qs: Question[], answers: Record<string, number[]>, durationSec: number): QuizResult {
  const byTopic: QuizResult["byTopic"] = {};
  const wrongIds: string[] = [];
  let correct = 0;
  for (const q of qs) {
    byTopic[q.topic] = byTopic[q.topic] ?? { correct: 0, total: 0 };
    byTopic[q.topic].total++;
    if (isCorrect(q, answers[q.id])) {
      correct++;
      byTopic[q.topic].correct++;
    } else wrongIds.push(q.id);
  }
  return { correct, total: qs.length, durationSec, byTopic, wrongIds, answers };
}

/**
 * Runs a set of questions.
 * - feedback="immediate": each question is checked and explained before moving on (lesson knowledge checks).
 * - feedback="end": answers are hidden until submission (exams).
 */
export function QuizRunner({
  questions,
  feedback,
  timeLimitSec,
  shuffleOptions = false,
  onComplete,
  title,
}: {
  questions: Question[];
  feedback: "immediate" | "end";
  timeLimitSec?: number;
  shuffleOptions?: boolean;
  onComplete: (r: QuizResult) => void;
  title?: string;
}) {
  // Option order per question (display index → original index). Randomised once per run.
  const order = useMemo(
    () =>
      Object.fromEntries(
        questions.map((q) => {
          const idx = q.options.map((_, i) => i);
          return [q.id, shuffleOptions && q.type !== "truefalse" ? shuffle(idx) : idx];
        }),
      ) as Record<string, number[]>,
    [questions, shuffleOptions],
  );

  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = useState(timeLimitSec ?? 0);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const q = questions[i];
  const sel = answers[q.id] ?? [];
  const isChecked = !!checked[q.id];
  const answeredCount = questions.filter((x) => (answers[x.id] ?? []).length > 0).length;

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete(scoreQuiz(questions, answers, Math.round((Date.now() - startRef.current) / 1000)));
  }, [answers, onComplete, questions]);

  useEffect(() => {
    if (!timeLimitSec) return;
    const t = setInterval(() => {
      const left = timeLimitSec - Math.floor((Date.now() - startRef.current) / 1000);
      setRemaining(Math.max(0, left));
    }, 1000);
    return () => clearInterval(t);
  }, [timeLimitSec]);

  useEffect(() => {
    if (timeLimitSec && remaining === 0 && Date.now() - startRef.current > 1500) finish();
  }, [remaining, timeLimitSec, finish]);

  // Move focus to the new question when navigating, but not on first render (would scroll the page).
  const prevI = useRef(i);
  useEffect(() => {
    if (prevI.current !== i) headingRef.current?.focus();
    prevI.current = i;
  }, [i]);

  const toggle = (orig: number) => {
    if (isChecked) return;
    setAnswers((a) => {
      const cur = a[q.id] ?? [];
      if (q.type === "multi") return { ...a, [q.id]: cur.includes(orig) ? cur.filter((x) => x !== orig) : [...cur, orig] };
      return { ...a, [q.id]: [orig] };
    });
  };

  const submit = () => {
    const unanswered = questions.length - answeredCount;
    if (feedback === "end" && unanswered > 0 && !window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    finish();
  };

  const last = i === questions.length - 1;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/80">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div className="text-sm text-slate-300">
          {title && <span className="mr-2 font-semibold text-white">{title}</span>}
          Question {i + 1} of {questions.length}
          <span className="ml-2 text-slate-500">· {answeredCount} answered</span>
        </div>
        {timeLimitSec ? (
          <div
            className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-sm", remaining < 60 ? "bg-hazard-500/20 text-hazard-400" : "bg-white/5 text-slate-200")}
            role="timer"
            aria-live={remaining < 60 ? "assertive" : "off"}
            aria-label={`Time remaining ${mm} minutes ${ss} seconds`}
          >
            <Clock className="h-4 w-4" aria-hidden /> {mm}:{ss}
          </div>
        ) : (
          <Badge>Untimed</Badge>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <Badge tone="cyan">{typeLabel[q.type]}</Badge>
          <Badge>{q.topic}</Badge>
        </div>
        {q.scenario && <p className="mt-4 rounded-xl border-l-4 border-cyan-400 bg-white/5 p-4 text-sm leading-relaxed text-slate-200">{q.scenario}</p>}
        <h3 ref={headingRef} tabIndex={-1} className="mt-4 text-lg font-semibold text-white focus:outline-none">
          {q.stem}
        </h3>

        <fieldset className="mt-4">
          <legend className="sr-only">{q.type === "multi" ? "Select all correct options" : "Select one option"}</legend>
          <ul className="space-y-2">
            {order[q.id].map((orig, displayIdx) => {
              const chosen = sel.includes(orig);
              const correct = q.correct.includes(orig);
              const reveal = feedback === "immediate" && isChecked;
              return (
                <li key={orig}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition focus-within:ring-2 focus-within:ring-cyan-300",
                      !reveal && chosen && "border-cyan-400 bg-cyan-400/10 text-white",
                      !reveal && !chosen && "border-white/10 text-slate-200 hover:border-white/25 hover:bg-white/5",
                      reveal && correct && "border-safe-500/70 bg-safe-500/10 text-white",
                      reveal && chosen && !correct && "border-hazard-500/70 bg-hazard-500/10 text-white",
                      reveal && !chosen && !correct && "border-white/10 text-slate-400",
                      isChecked && "cursor-default",
                    )}
                  >
                    <input
                      type={q.type === "multi" ? "checkbox" : "radio"}
                      name={`q-${q.id}`}
                      className="mt-0.5 h-4 w-4 accent-cyan-400"
                      checked={chosen}
                      disabled={isChecked}
                      onChange={() => toggle(orig)}
                    />
                    <span className="flex-1">
                      <span className="mr-2 font-mono text-xs text-slate-500">{String.fromCharCode(65 + displayIdx)}</span>
                      {q.options[orig]}
                    </span>
                    {reveal && correct && <CheckCircle2 className="h-5 w-5 shrink-0 text-safe-400" aria-label="Correct answer" />}
                    {reveal && chosen && !correct && <XCircle className="h-5 w-5 shrink-0 text-hazard-400" aria-label="Incorrect" />}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {feedback === "immediate" && isChecked && (
          <div
            className={cn("mt-4 rounded-xl border p-4 text-sm", isCorrect(q, sel) ? "border-safe-500/40 bg-safe-500/10" : "border-hazard-500/40 bg-hazard-500/10")}
            role="status"
          >
            <p className="font-semibold text-white">{isCorrect(q, sel) ? "Correct" : "Not quite"}</p>
            <p className="mt-1 text-slate-200">{q.explanation}</p>
            {q.references?.length ? (
              <p className="mt-2 text-xs text-slate-400">Source: {q.references.map((r) => referenceById[r]?.title).filter(Boolean).join("; ")}</p>
            ) : null}
          </div>
        )}

        {/* controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
              <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
            </Button>
            {feedback === "end" && (
              <Button variant="ghost" aria-pressed={!!flags[q.id]} onClick={() => setFlags((f) => ({ ...f, [q.id]: !f[q.id] }))}>
                <Flag className={cn("h-4 w-4", flags[q.id] && "fill-caution-400 text-caution-400")} aria-hidden />
                {flags[q.id] ? "Flagged" : "Flag for review"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {feedback === "immediate" && !isChecked && (
              <Button onClick={() => setChecked((c) => ({ ...c, [q.id]: true }))} disabled={sel.length === 0}>
                Check answer
              </Button>
            )}
            {(feedback === "end" || isChecked) && !last && (
              <Button onClick={() => setI((x) => x + 1)}>
                Next <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
            {last && (feedback === "end" || isChecked) && <Button onClick={submit}>{feedback === "end" ? "Submit assessment" : "Finish"}</Button>}
          </div>
        </div>

        {/* navigator */}
        {questions.length > 1 && (
          <nav aria-label="Question navigation" className="mt-6 border-t border-white/10 pt-4">
            <ul className="flex flex-wrap gap-1.5">
              {questions.map((x, idx) => {
                const answered = (answers[x.id] ?? []).length > 0;
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      onClick={() => setI(idx)}
                      aria-label={`Go to question ${idx + 1}${answered ? ", answered" : ""}${flags[x.id] ? ", flagged" : ""}`}
                      aria-current={idx === i ? "step" : undefined}
                      className={cn(
                        "relative h-8 w-8 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                        idx === i ? "bg-cyan-400 text-navy-950" : answered ? "bg-white/15 text-white" : "bg-white/5 text-slate-400",
                      )}
                    >
                      {idx + 1}
                      {flags[x.id] && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-caution-400" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {feedback === "end" && answeredCount < questions.length && (
              <p className="mt-3 text-xs text-slate-400">{questions.length - answeredCount} unanswered — unanswered questions are marked incorrect.</p>
            )}
            {feedback === "end" && !last && (
              <Button variant="secondary" className="mt-3" onClick={submit}>
                Submit now
              </Button>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
