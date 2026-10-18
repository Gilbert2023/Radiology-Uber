"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, BookOpen, CheckCircle2, Clock, Download, FlaskConical, History, PlayCircle, RotateCcw, Target } from "lucide-react";
import { labs } from "@/content/labs";
import { progress, useProgress, isStorageAvailable, CAPSTONE_PASS_MARK } from "@/lib/progress";
import { computeStats } from "@/lib/stats";
import { downloadText, formatDate, formatDuration, pct } from "@/lib/utils";
import { Badge, Button, Callout, Card, EmptyState, LinkButton, ProgressBar } from "@/components/ui";
import { BarList, Ring, ScoreHistory } from "@/components/charts";
import { useAuth } from "@/lib/auth";

export function Dashboard() {
  const p = useProgress();
  const st = computeStats(p);
  const [confirmReset, setConfirmReset] = useState(false);
  const auth = useAuth();

  const stat = (icon: React.ReactNode, label: string, value: string, sub?: string) => (
    <Card className="flex items-center gap-4">
      <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      {auth.session ? (
        <Callout tone={auth.sync === "error" || auth.sync === "disabled" ? "warning" : "info"} title={`Signed in as ${auth.profile?.full_name || auth.session.user.email}`}>
          {auth.sync === "disabled"
            ? "This account has been disabled by an administrator, so progress is not being saved."
            : auth.sync === "error"
              ? "Progress could not be saved to your account just now. It is kept in this browser and will retry on your next change."
              : "Your progress is saved to your account and available on any device you sign in on."}
        </Callout>
      ) : auth.enabled ? (
        <Callout tone="info" title="You are learning as a guest">
          Progress is saved in this browser only.{" "}
          <Link href="/login/" className="font-semibold text-cyan-300 underline-offset-2 hover:underline">Create a free account</Link> to keep it safe and use it on
          any device — your guest progress will be added to your account.
        </Callout>
      ) : (
        <Callout tone="info" title="Local demonstration mode">
          Progress is saved in this browser only (localStorage). It is not linked to an account, does not sync between devices and is lost if you clear site
          data. {isStorageAvailable() ? "" : "Browser storage appears unavailable, so progress will not persist after this session."}
        </Callout>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stat(<BookOpen className="h-5 w-5" />, "Lessons", `${st.lessonsDone}/${st.lessonsTotal}`, `${st.lessonPct}% complete`)}
        {stat(<Target className="h-5 w-5" />, "Knowledge checks", st.quizAvg === null ? "—" : `${st.quizAvg}%`, `${Object.keys(p.lessonQuiz).length} attempted`)}
        {stat(<FlaskConical className="h-5 w-5" />, "Labs", `${st.labsDone}/${st.labsTotal}`)}
        {stat(<Clock className="h-5 w-5" />, "Learning time", formatDuration(p.learningSeconds), "time on lesson pages")}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center text-center">
          <Ring value={st.overall} label="Overall course completion" size={150} />
          <p className="mt-3 font-semibold text-white">Overall completion</p>
          <p className="text-xs text-slate-400">Lessons 70% · labs 15% · capstone pass 15%</p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <PlayCircle className="h-5 w-5 text-cyan-300" aria-hidden /> Recommended next
          </h2>
          {st.next ? (
            <div className="mt-3 rounded-xl bg-gradient-to-r from-cyan-400/15 to-transparent p-4">
              <p className="text-xs text-cyan-300">
                Module {st.next.module.number}: {st.next.module.title}
              </p>
              <p className="mt-1 text-lg font-semibold text-white">{st.next.lesson.title}</p>
              <p className="text-sm text-slate-300">{st.next.lesson.summary}</p>
              <LinkButton href={`/curriculum/${st.next.module.id}/${st.next.lesson.id}/`} className="mt-3">
                Continue learning
              </LinkButton>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-300">All lessons complete. {st.capstonePassed ? "Capstone passed." : "Take the capstone assessment."}</p>
          )}
          {st.weakTopics.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-white">Topics to revise</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {st.weakTopics.map((w) => (
                  <Badge key={w.topic} tone="warn">
                    {w.topic} · {w.pct}%
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-white">Modules</h2>
          <ul className="mt-4 space-y-3">
            {st.moduleStatus.map((m) => (
              <li key={m.module.id}>
                <Link href={`/curriculum/${m.module.id}/`} className="block rounded-lg p-1 hover:bg-white/5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 text-slate-200">
                      {m.pct === 100 ? <CheckCircle2 className="h-4 w-4 text-safe-400" aria-label="Completed" /> : <span className="w-4 font-mono text-xs text-slate-500">{m.module.number}</span>}
                      {m.module.title}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{m.pct === 100 ? "Completed" : m.completed ? "In progress" : "Pending"}</span>
                  </div>
                  <ProgressBar value={m.pct} label={`${m.module.title} completion`} className="mt-1.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold text-white">Exam performance by topic</h2>
            <div className="mt-4">
              <BarList
                data={Object.entries(st.topic).map(([t, v]) => ({ label: t, value: pct(v.correct, v.total), detail: `${v.correct}/${v.total}` }))}
                emptyText="Complete a practice exam to see topic analytics."
              />
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold text-white">Exam score history</h2>
            <div className="mt-3">
              <ScoreHistory
                points={[...p.exams].reverse().map((e) => ({ label: `${e.kind} ${formatDate(e.date)}`, value: pct(e.correct, e.total) }))}
              />
            </div>
            <LinkButton href="/exam/" variant="ghost" className="mt-2">
              Examination centre
            </LinkButton>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <Award className="h-5 w-5 text-cyan-300" aria-hidden /> Course completion record
          </h2>
          {st.certificateEarned ? (
            <>
              <p className="mt-2 text-sm text-slate-300">Criteria met: all lessons complete and capstone ≥ {CAPSTONE_PASS_MARK * 100}%.</p>
              <LinkButton href="/certificate/" className="mt-3">View completion record</LinkButton>
            </>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              <li className={st.allLessonsDone ? "text-safe-400" : "text-slate-300"}>
                {st.allLessonsDone ? "✓" : "○"} Complete all {st.lessonsTotal} lessons ({st.lessonsDone} done)
              </li>
              <li className={st.capstonePassed ? "text-safe-400" : "text-slate-300"}>
                {st.capstonePassed ? "✓" : "○"} Score ≥ {CAPSTONE_PASS_MARK * 100}% on the capstone
                {st.best ? ` (best ${pct(st.best.correct, st.best.total)}%)` : ""}
              </li>
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">A course completion record is not an accreditation or an externally recognised MRSO credential.</p>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <History className="h-5 w-5 text-cyan-300" aria-hidden /> Recent activity
          </h2>
          {p.activity.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No activity yet" action={<LinkButton href="/curriculum/m1/static-field/">Start the first lesson</LinkButton>} />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-white/5">
              {p.activity.slice(0, 8).map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={a.href} className="text-slate-200 hover:text-cyan-300">{a.label}</Link>
                  <span className="shrink-0 text-xs text-slate-500">{formatDate(a.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-white">Lab results</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {labs.map((l) => {
            const r = p.labResults[l.id];
            return (
              <li key={l.id}>
                <Link href={`/lab/${l.id}/`} className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm hover:bg-white/10">
                  <span className="text-slate-200">{l.title}</span>
                  <span className={r ? "text-cyan-300" : "text-slate-500"}>{r ? `${r.score}/${r.total}` : "Not started"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => downloadText("mrso-academy-progress.json", progress.exportJson(), "application/json")}>
          <Download className="h-4 w-4" aria-hidden /> Export progress (JSON)
        </Button>
        {confirmReset ? (
          <>
            <Button variant="danger" onClick={() => { progress.reset(); setConfirmReset(false); }}>{auth.session ? "Confirm: erase all progress (also from your account)" : "Confirm: erase all progress"}</Button>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Reset progress
          </Button>
        )}
      </div>
    </div>
  );
}
