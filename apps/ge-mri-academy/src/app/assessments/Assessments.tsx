"use client";

import { useEffect, useMemo, useState } from "react";
import { QUESTIONS } from "@/content/questions";
import type { Question, QuestionTopic } from "@/content/types";
import { progress, useProgress } from "@/lib/progress";
import { Chip, Callout } from "@/components/ui";

const TOPICS: QuestionTopic[] = ["Physics", "Parameters", "Sequences", "Protocols", "Artefacts", "Safety"];

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

type Mode = "setup" | "practice" | "timed" | "review";

export function Assessments() {
  const s = useProgress();
  const [mode, setMode] = useState<Mode>("setup");
  const [topic, setTopic] = useState<QuestionTopic | "All">("All");
  const [count, setCount] = useState(15);
  const [minutes, setMinutes] = useState(20);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [qs, setQs] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);

  const wrongIds = useMemo(() => Object.entries(s.questionHistory).filter(([, h]) => !h.correct).map(([id]) => id), [s.questionHistory]);

  const start = (m: "practice" | "timed") => {
    let pool = QUESTIONS.filter((q) => topic === "All" || q.topic === topic);
    if (onlyWrong) pool = pool.filter((q) => wrongIds.includes(q.id));
    // Shuffle question order and answer options so position carries no information.
    const picked = shuffle(pool).slice(0, m === "timed" ? count : pool.length).map((q) => {
      const order = shuffle(q.options.map((_, i) => i));
      return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
    });
    setQs(picked); setIdx(0); setAnswers({}); setMode(m); setStartedAt(Date.now()); setNow(Date.now());
  };

  const finish = () => {
    const correct = qs.filter((q) => answers[q.id] === q.answer).length;
    progress.recordExam({ mode: mode === "timed" ? "timed" : "practice", topic, total: qs.length, correct, wrongIds: qs.filter((q) => answers[q.id] !== q.answer).map((q) => q.id), durationSec: Math.round((Date.now() - startedAt) / 1000) });
    setMode("review");
  };

  useEffect(() => {
    if (mode !== "timed") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [mode]);
  const remaining = Math.max(0, minutes * 60 - Math.floor((now - startedAt) / 1000));
  useEffect(() => { if (mode === "timed" && remaining === 0) finish(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [remaining, mode]);

  if (mode === "setup") {
    const answered = Object.keys(s.questionHistory).length;
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="panel panel-pad space-y-4">
          <div>
            <div className="label mb-1">Topic</div>
            <div className="flex flex-wrap gap-1.5">{(["All", ...TOPICS] as const).map((t) => <button key={t} className={topic === t ? "btn-primary" : "btn-secondary"} aria-pressed={topic === t} onClick={() => setTopic(t)}>{t} <span className="text-xs opacity-70">{t === "All" ? QUESTIONS.length : QUESTIONS.filter((q) => q.topic === t).length}</span></button>)}</div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-700" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} disabled={!wrongIds.length} /> Only questions I previously got wrong ({wrongIds.length})</label>
          <div className="flex flex-wrap gap-2 border-t border-rule pt-4">
            <button className="btn-primary" onClick={() => start("practice")}>Start practice (immediate feedback)</button>
          </div>
          <div className="grid gap-3 border-t border-rule pt-4 sm:grid-cols-[auto_auto_1fr] sm:items-end">
            <div><label className="label" htmlFor="qc">Questions</label><select id="qc" className="input mt-1" value={count} onChange={(e) => setCount(Number(e.target.value))}>{[10, 15, 20, 30, 50].map((n) => <option key={n}>{n}</option>)}</select></div>
            <div><label className="label" htmlFor="qm">Minutes</label><select id="qm" className="input mt-1" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>{[10, 15, 20, 30, 45, 60].map((n) => <option key={n}>{n}</option>)}</select></div>
            <div><button className="btn-secondary" onClick={() => start("timed")}>Start timed mock examination</button></div>
          </div>
        </div>
        <div className="panel panel-pad text-sm">
          <div className="kicker mb-2">Your record</div>
          <p>{answered} questions answered · {Object.values(s.questionHistory).filter((h) => h.correct).length} correct on last attempt</p>
          {s.exams.length > 0 && <ul className="mt-3 space-y-1 text-xs">{s.exams.slice(0, 6).map((e) => <li key={e.id} className="flex justify-between"><span>{new Date(e.date).toLocaleDateString("en-GB")} · {e.mode} · {e.topic}</span><span className="font-mono">{e.correct}/{e.total}</span></li>)}</ul>}
        </div>
      </div>
    );
  }

  if (!qs.length) return <Callout tone="info">No questions match this selection. <button className="underline" onClick={() => setMode("setup")}>Back</button></Callout>;

  if (mode === "review") {
    const correct = qs.filter((q) => answers[q.id] === q.answer).length;
    const wrong = qs.filter((q) => answers[q.id] !== q.answer);
    const byTopic = TOPICS.map((t) => { const tq = qs.filter((q) => q.topic === t); return { t, n: tq.length, c: tq.filter((q) => answers[q.id] === q.answer).length }; }).filter((x) => x.n);
    return (
      <div className="space-y-5">
        <div className="panel panel-pad">
          <div className="kicker">Result</div>
          <p className="font-serif text-3xl font-semibold">{correct} / {qs.length} <span className="text-lg text-ink-500">({Math.round((correct / qs.length) * 100)}%)</span></p>
          <div className="mt-2 flex flex-wrap gap-2">{byTopic.map((b) => <Chip key={b.t}>{b.t}: {b.c}/{b.n}</Chip>)}</div>
          <div className="mt-4 flex gap-2"><button className="btn-primary" onClick={() => setMode("setup")}>New session</button></div>
        </div>
        <h2 className="font-serif text-xl font-semibold">Review of incorrect answers ({wrong.length})</h2>
        {wrong.map((q) => (
          <div key={q.id} className="panel panel-pad text-sm">
            <p className="font-medium text-ink-900">{q.stem}</p>
            <p className="mt-2 text-signal-red">Your answer: {answers[q.id] !== undefined ? q.options[answers[q.id]] : "Not answered"}</p>
            <p className="text-signal-green">Correct: {q.options[q.answer]}</p>
            <p className="mt-1 text-ink-600">{q.explanation}</p>
          </div>
        ))}
      </div>
    );
  }

  const q = qs[idx];
  const picked = answers[q.id];
  const reveal = mode === "practice" && picked !== undefined;
  const choose = (i: number) => {
    if (mode === "practice" && picked !== undefined) return;
    setAnswers({ ...answers, [q.id]: i });
    progress.recordAnswer(q.id, i === q.answer);
  };
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center justify-between text-sm text-ink-600">
        <span>Question {idx + 1} of {qs.length} · <Chip>{q.topic}</Chip> <Chip>{q.type}</Chip></span>
        {mode === "timed" && <span className={`font-mono ${remaining < 60 ? "text-signal-red" : ""}`} aria-live="polite">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span>}
      </div>
      <div className="panel panel-pad">
        <p className="text-[15px] font-medium text-ink-900">{q.stem}</p>
        <div className="mt-4 space-y-2" role="radiogroup" aria-label="Answer options">
          {q.options.map((o, i) => {
            const cls = reveal ? (i === q.answer ? "border-signal-green bg-signal-greenBg" : i === picked ? "border-signal-red bg-signal-redBg" : "border-rule") : picked === i ? "border-ink-700 bg-paper-200" : "border-rule hover:border-ink-400";
            return <button key={i} role="radio" aria-checked={picked === i} onClick={() => choose(i)} className={`block w-full rounded border bg-white px-3 py-2 text-left text-sm ${cls}`}><span className="mr-2 font-mono text-ink-400">{String.fromCharCode(65 + i)}</span>{o}</button>;
          })}
        </div>
        {reveal && <p className="mt-3 rounded bg-paper-200 px-3 py-2 text-sm text-ink-700"><strong>{picked === q.answer ? "Correct." : "Not quite."}</strong> {q.explanation}</p>}
      </div>
      <div className="mt-4 flex justify-between">
        <button className="btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Previous</button>
        <div className="flex gap-2">
          {idx + 1 < qs.length ? <button className="btn-primary" onClick={() => setIdx(idx + 1)}>Next →</button> : <button className="btn-primary" onClick={finish}>Finish and review</button>}
        </div>
      </div>
      <button className="btn-ghost mt-4 text-xs" onClick={() => setMode("setup")}>Quit session</button>
    </div>
  );
}
