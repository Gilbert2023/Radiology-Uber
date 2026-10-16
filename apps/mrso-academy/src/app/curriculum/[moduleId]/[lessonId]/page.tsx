import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ChevronLeft, ChevronRight, Clock, Lightbulb, Stethoscope, Target } from "lucide-react";
import { allLessons, findLesson, questionById } from "@/content";
import { Callout, Card, Container } from "@/components/ui";
import { LessonIllustration } from "@/components/art/LessonIllustration";
import { ReferenceList } from "@/components/ReferenceList";
import { LessonActions, LessonTimer, KnowledgeCheck, ChecklistDownload } from "./LessonClient";

export function generateStaticParams() {
  return allLessons.map((l) => ({ moduleId: l.module.id, lessonId: l.lesson.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ moduleId: string; lessonId: string }> }): Promise<Metadata> {
  const { moduleId, lessonId } = await params;
  const ref = findLesson(moduleId, lessonId);
  return { title: ref ? ref.lesson.title : "Lesson", description: ref?.lesson.summary };
}

export default async function LessonPage({ params }: { params: Promise<{ moduleId: string; lessonId: string }> }) {
  const { moduleId, lessonId } = await params;
  const ref = findLesson(moduleId, lessonId);
  if (!ref) notFound();
  const { module: m, lesson: l, key } = ref;
  const idx = allLessons.findIndex((x) => x.key === key);
  const prev = allLessons[idx - 1];
  const next = allLessons[idx + 1];
  const lessonNo = m.lessons.findIndex((x) => x.id === l.id) + 1;
  const qs = l.questionIds.map((id) => questionById[id]).filter(Boolean);
  const href = `/curriculum/${m.id}/${l.id}/`;

  return (
    <article>
      <LessonTimer />
      <header className="border-b border-white/10 bg-gradient-to-b from-navy-800 to-navy-950">
        <Container className="py-10">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400">
            <Link href="/curriculum/" className="hover:text-cyan-300">Curriculum</Link> <span aria-hidden>/</span>{" "}
            <Link href={`/curriculum/${m.id}/`} className="hover:text-cyan-300">
              Module {m.number}: {m.title}
            </Link>
          </nav>
          <p className="mt-4 font-mono text-xs text-cyan-300">
            LESSON {m.number}.{lessonNo}
          </p>
          <h1 className="mt-1 max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-4xl">{l.title}</h1>
          <p className="mt-3 max-w-3xl text-slate-300">{l.summary}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm text-slate-400">
              <Clock className="h-4 w-4" aria-hidden /> {l.minutes} min
            </span>
            <LessonActions lessonKey={key} label={l.title} href={href} />
          </div>
        </Container>
      </header>

      <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-10">
          <Card>
            <h2 className="flex items-center gap-2 font-semibold text-white">
              <Target className="h-5 w-5 text-cyan-300" aria-hidden /> Learning objectives
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-300 marker:text-cyan-400">
              {l.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </Card>

          {l.illustration && <LessonIllustration k={l.illustration} />}

          {l.sections.map((s) => (
            <section key={s.heading} aria-labelledby={`h-${s.heading}`} className="prose-lesson">
              <h2 id={`h-${s.heading}`} className="mb-3 text-xl font-semibold text-white">
                {s.heading}
              </h2>
              {s.body.map((b, i) => (
                <p key={i}>{b}</p>
              ))}
              {s.bullets && (
                <ul className="mt-3 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-slate-300">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.callout && (
                <div className="mt-4">
                  <Callout tone={s.callout.tone} title={s.callout.title}>
                    {s.callout.text}
                  </Callout>
                </div>
              )}
            </section>
          ))}

          {l.clinicalExample && (
            <section className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-5">
              <h2 className="flex items-center gap-2 font-semibold text-white">
                <Stethoscope className="h-5 w-5 text-cyan-300" aria-hidden /> Clinical example: {l.clinicalExample.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{l.clinicalExample.text}</p>
            </section>
          )}

          {l.checklist && (
            <section className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-white">Safety checklist: {l.checklist.title}</h2>
                <ChecklistDownload title={l.checklist.title} items={l.checklist.items} />
              </div>
              <ul className="mt-3 space-y-2">
                {l.checklist.items.map((it) => (
                  <li key={it} className="flex gap-3 text-sm text-slate-300">
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/30" aria-hidden />
                    {it}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-hazard-500/30 bg-hazard-500/5 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-white">
              <AlertCircle className="h-5 w-5 text-hazard-400" aria-hidden /> Common mistakes and misconceptions
            </h2>
            <ul className="mt-3 space-y-2">
              {l.mistakes.map((x) => (
                <li key={x} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-hazard-400" aria-hidden>✗</span>
                  {x}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="kc">
            <h2 id="kc" className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
              <Lightbulb className="h-5 w-5 text-cyan-300" aria-hidden /> End-of-lesson knowledge check
            </h2>
            <KnowledgeCheck lessonKey={key} label={l.title} href={href} questionIds={qs.map((q) => q.id)} />
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">References</h2>
            <ReferenceList ids={l.references} />
          </section>

          <nav aria-label="Lesson navigation" className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
            {prev ? (
              <Link href={`/curriculum/${prev.module.id}/${prev.lesson.id}/`} className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm hover:bg-white/5">
                <ChevronLeft className="h-4 w-4" aria-hidden />
                <span>
                  <span className="block text-xs text-slate-400">Previous</span>
                  {prev.lesson.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/curriculum/${next.module.id}/${next.lesson.id}/`} className="flex items-center justify-end gap-2 rounded-xl border border-white/10 p-3 text-right text-sm hover:bg-white/5">
                <span>
                  <span className="block text-xs text-slate-400">Next</span>
                  {next.lesson.title}
                </span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </nav>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">In this module</p>
            <ol className="mt-3 space-y-1">
              {m.lessons.map((x, i) => (
                <li key={x.id}>
                  <Link
                    href={`/curriculum/${m.id}/${x.id}/`}
                    aria-current={x.id === l.id ? "page" : undefined}
                    className={`block rounded-lg px-2 py-1.5 text-sm ${x.id === l.id ? "bg-cyan-400/10 text-cyan-200" : "text-slate-300 hover:bg-white/5"}`}
                  >
                    {m.number}.{i + 1} {x.title}
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
          <Callout tone="warning" title="Apply locally">
            Apply this lesson through your facility&apos;s approved policy, current guidance and manufacturer instructions.
          </Callout>
        </aside>
      </Container>
    </article>
  );
}
