"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Award, ClipboardList, Database, PlayCircle } from "lucide-react";
import { questions } from "@/content";
import type { Question, QuestionType, Topic } from "@/content/types";
import { CAPSTONE_PASS_MARK, progress, useProgress } from "@/lib/progress";
import { formatDate, formatDuration, pct, shuffle } from "@/lib/utils";
import { Badge, Button, Callout, Card, LinkButton } from "@/components/ui";
import { QuizRunner, type QuizResult } from "@/components/quiz/QuizRunner";
import { ResultReport } from "@/components/quiz/ResultReport";
import { computeStats } from "@/lib/stats";

const ALL_TOPICS = Array.from(new Set(questions.map((q) => q.topic))) as Topic[];
const TYPES: { id: QuestionType; label: string }[] = [
  { id: "mcq", label: "Multiple choice" },
  { id: "multi", label: "Select all that apply" },
  { id: "truefalse", label: "True / false" },
  { id: "scenario", label: "Clinical scenario" },
];
const CAPSTONE_SIZE = 30;
const CAPSTONE_MINUTES = 60;

/** Capstone: every capstone scenario item plus a topic-stratified draw favouring harder and scenario items. */
function buildCapstone(): Question[] {
  const cap = questions.filter((q) => q.id.startsWith("cap-"));
  const pool = shuffle(questions.filter((q) => !q.id.startsWith("cap-") && (q.difficulty >= 2 || q.type === "scenario")));
  const picked: Question[] = [...cap];
  const perTopic: Record<string, number> = {};
  for (const q of pool) {
    if (picked.length >= CAPSTONE_SIZE) break;
    if ((perTopic[q.topic] ?? 0) >= 2) continue;
    perTopic[q.topic] = (perTopic[q.topic] ?? 0) + 1;
    picked.push(q);
  }
  for (const q of pool) {
    if (picked.length >= CAPSTONE_SIZE) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return shuffle(picked);
}

type Phase = { kind: "setup" } | { kind: "running"; qs: Question[]; exam: "practice" | "capstone"; timed: boolean; limit?: number } | { kind: "result"; qs: Question[]; exam: "practice" | "capstone"; timed: boolean; result: QuizResult };

export function ExamCentre() {
  const params = useSearchParams();
  const p = useProgress();
  const st = computeStats(p);
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [exam, setExam] = useState<"practice" | "capstone">(params.get("start") === "capstone" ? "capstone" : "practice");
  const [topics, setTopics] = useState<Topic[]>(ALL_TOPICS);
  const [types, setTypes] = useState<QuestionType[]>(TYPES.map((t) => t.id));
  const [count, setCount] = useState(15);
  const [timed, setTimed] = useState(false);
  const [randomise, setRandomise] = useState(true);
  const startRef = useRef<HTMLButtonElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.get("start")) startRef.current?.focus();
  }, [params]);

  const pool = useMemo(() => questions.filter((q) => topics.includes(q.topic) && types.includes(q.type)), [topics, types]);

  const start = () => {
    if (exam === "capstone") {
      setPhase({ kind: "running", qs: buildCapstone(), exam, timed: true, limit: CAPSTONE_MINUTES * 60 });
    } else {
      const chosen = (randomise ? shuffle(pool) : pool).slice(0, Math.min(count, pool.length));
      setPhase({ kind: "running", qs: chosen, exam, timed, limit: timed ? Math.max(60, chosen.length * 90) : undefined });
    }
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const complete = (qs: Question[], ex: "practice" | "capstone", wasTimed: boolean) => (r: QuizResult) => {
    progress.recordExam({
      id: `${Date.now()}`,
      kind: ex,
      mode: wasTimed ? "timed" : "untimed",
      date: new Date().toISOString(),
      total: r.total,
      correct: r.correct,
      durationSec: r.durationSec,
      byTopic: r.byTopic,
      wrongIds: r.wrongIds,
    });
    setPhase({ kind: "result", qs, exam: ex, timed: wasTimed, result: r });
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div ref={topRef} className="scroll-mt-24 space-y-8">
      {phase.kind === "running" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">{phase.exam === "capstone" ? "Capstone assessment" : "Practice assessment"}</h2>
            <Button variant="ghost" onClick={() => window.confirm("Abandon this attempt? It will not be recorded.") && setPhase({ kind: "setup" })}>
              Abandon attempt
            </Button>
          </div>
          <QuizRunner
            questions={phase.qs}
            feedback="end"
            shuffleOptions={phase.exam === "capstone" || randomise}
            timeLimitSec={phase.limit}
            onComplete={complete(phase.qs, phase.exam, phase.timed)}
          />
        </div>
      )}

      {phase.kind === "result" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">{phase.exam === "capstone" ? "Capstone result" : "Practice result"}</h2>
          <ResultReport
            result={phase.result}
            questions={phase.qs}
            passMark={phase.exam === "capstone" ? CAPSTONE_PASS_MARK : undefined}
            onRetry={() => setPhase({ kind: "setup" })}
            extra={
              phase.exam === "capstone" && st.certificateEarned ? (
                <LinkButton href="/certificate/" className="mt-3">
                  <Award className="h-4 w-4" aria-hidden /> View course completion record
                </LinkButton>
              ) : phase.exam === "capstone" && pct(phase.result.correct, phase.result.total) >= CAPSTONE_PASS_MARK * 100 && !st.allLessonsDone ? (
                <p className="mt-2 text-sm text-caution-400">Capstone criterion met. Complete all lessons to receive the course completion record.</p>
              ) : null
            }
          />
        </div>
      )}

      {phase.kind === "setup" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <ClipboardList className="h-5 w-5 text-cyan-300" aria-hidden /> Configure assessment
            </h2>
            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-slate-300">Assessment type</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {(["practice", "capstone"] as const).map((k) => (
                  <label
                    key={k}
                    className={`cursor-pointer rounded-xl border p-4 focus-within:ring-2 focus-within:ring-cyan-300 ${exam === k ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 hover:bg-white/5"}`}
                  >
                    <input type="radio" name="exam" className="sr-only" checked={exam === k} onChange={() => setExam(k)} />
                    <span className="font-semibold text-white">{k === "practice" ? "Practice assessment" : "Capstone assessment"}</span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {k === "practice"
                        ? "Choose topics, question types, length and timing."
                        : `${CAPSTONE_SIZE} scenario-weighted questions across all topics · ${CAPSTONE_MINUTES} min · pass ≥ ${CAPSTONE_PASS_MARK * 100}%`}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {exam === "practice" && (
              <>
                <fieldset className="mt-6">
                  <legend className="text-sm font-medium text-slate-300">Topics</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setTopics(topics.length === ALL_TOPICS.length ? [] : ALL_TOPICS)}>
                      {topics.length === ALL_TOPICS.length ? "Clear all" : "Select all"}
                    </Button>
                    {ALL_TOPICS.map((t) => (
                      <label key={t} className={`cursor-pointer rounded-full border px-3 py-1 text-xs focus-within:ring-2 focus-within:ring-cyan-300 ${topics.includes(t) ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-white/15 text-slate-400"}`}>
                        <input type="checkbox" className="sr-only" checked={topics.includes(t)} onChange={() => setTopics(toggle(topics, t))} />
                        {t}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="mt-5">
                  <legend className="text-sm font-medium text-slate-300">Question types</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TYPES.map((t) => (
                      <label key={t.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs focus-within:ring-2 focus-within:ring-cyan-300 ${types.includes(t.id) ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-white/15 text-slate-400"}`}>
                        <input type="checkbox" className="sr-only" checked={types.includes(t.id)} onChange={() => setTypes(toggle(types, t.id))} />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <label className="text-sm text-slate-300">
                    Number of questions
                    <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-white/15 bg-navy-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                      {[5, 10, 15, 20, 30, 50, 1000].map((n) => (
                        <option key={n} value={n}>{n === 1000 ? "All available" : n}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 sm:mt-6">
                    <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-4 w-4 accent-cyan-400" />
                    Timed (90 s per question)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 sm:mt-6">
                    <input type="checkbox" checked={randomise} onChange={(e) => setRandomise(e.target.checked)} className="h-4 w-4 accent-cyan-400" />
                    Randomise questions &amp; options
                  </label>
                </div>
                <p className="mt-4 text-sm text-slate-400" aria-live="polite">
                  {pool.length} matching question{pool.length === 1 ? "" : "s"} in the bank
                  {pool.length > 0 && ` — this attempt will use ${Math.min(count, pool.length)}.`}
                </p>
              </>
            )}

            {exam === "capstone" && (
              <div className="mt-5">
                <Callout tone="info" title="About the capstone">
                  The capstone tests reasoning across physics, screening, implants, RF, projectiles, emergencies, QA, governance, risk assessment and
                  leadership. A course completion record is issued when all lessons are complete and the capstone score is ≥ {CAPSTONE_PASS_MARK * 100}%. It is
                  not an accreditation or externally recognised credential.
                </Callout>
              </div>
            )}

            <Button ref={startRef} className="mt-6" onClick={start} disabled={exam === "practice" && pool.length === 0}>
              <PlayCircle className="h-4 w-4" aria-hidden /> Start {exam === "capstone" ? "capstone" : "assessment"}
            </Button>
            {exam === "practice" && pool.length === 0 && <p className="mt-2 text-sm text-hazard-400">Select at least one topic and one question type.</p>}
          </Card>

          <div className="space-y-6">
            <Card>
              <h2 className="flex items-center gap-2 font-semibold text-white">
                <Database className="h-5 w-5 text-cyan-300" aria-hidden /> Question bank
              </h2>
              <p className="mt-1 text-3xl font-bold text-white">{questions.length}</p>
              <p className="text-xs text-slate-400">items, typed by topic, module, type and difficulty. Architecture supports expansion to 500+ (see README).</p>
              <ul className="mt-3 space-y-1 text-xs">
                {ALL_TOPICS.map((t) => (
                  <li key={t} className="flex justify-between text-slate-300">
                    <span>{t}</span>
                    <span className="text-slate-500">{questions.filter((q) => q.topic === t).length}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="font-semibold text-white">Previous attempts</h2>
              {p.exams.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">No attempts yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-white/5">
                  {p.exams.slice(0, 8).map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="text-slate-300">
                        {e.kind === "capstone" ? <Badge tone="cyan">Capstone</Badge> : "Practice"} <span className="text-xs text-slate-500">{formatDate(e.date)} · {e.mode} · {formatDuration(e.durationSec)}</span>
                      </span>
                      <span className="font-semibold text-white">{pct(e.correct, e.total)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
