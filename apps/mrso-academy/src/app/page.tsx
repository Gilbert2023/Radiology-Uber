import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, FlaskConical, GraduationCap, ShieldCheck, Target } from "lucide-react";
import { ScannerScene } from "@/components/art/ScannerScene";
import { SafetySign, signMeta, type SignKind } from "@/components/art/SafetySign";
import { Badge, Card, Container, LinkButton } from "@/components/ui";
import { modules, questions, allLessons, totalLessonMinutes } from "@/content";
import { cases } from "@/content/cases";
import { labs } from "@/content/labs";
import { references } from "@/content/references";
import { media } from "@/content/media";
import { DashboardPreview } from "@/components/DashboardPreview";

const objectives = [
  "Explain B0, spatial field gradients, RF and switched gradients and their clinical hazards at 1.5 T and 3 T.",
  "Design and audit zone-based access control and screening processes.",
  "Perform structured implant and device risk assessments against MR Conditional labelling.",
  "Prevent RF burns through positioning, cable routing and correct use of SAR and B1+rms limits.",
  "Lead emergency response — distinguishing evacuation, emergency power off and magnet stop.",
  "Investigate incidents, run audits and lead a multidisciplinary MR safety programme.",
];

const signs: SignKind[] = ["magnetic-field", "projectile", "no-pacemaker", "no-metal", "cryogen", "oxygen", "mr-safe", "mr-conditional", "mr-unsafe"];

export default function HomePage() {
  const featured = cases.slice(0, 3);
  return (
    <>
      {/* HERO */}
      <section className="relative isolate min-h-[640px] overflow-hidden lg:min-h-[720px]" aria-labelledby="hero-title">
        {media.hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.hero.src} alt={media.hero.alt} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        ) : (
          <ScannerScene className="absolute inset-0 -z-20 h-full w-full" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/20" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-navy-950 to-transparent" />
        <Container className="flex min-h-[640px] flex-col justify-center py-20 lg:min-h-[720px]">
          <div className="max-w-2xl animate-fadeUp">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">Advanced level</Badge>
              <Badge tone="warn">For MR professionals</Badge>
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Advanced MRI Safety Officer Academy</p>
            <h1 id="hero-title" className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              MASTER MRI SAFETY.
              <br />
              <span className="bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent">PROTECT EVERY PATIENT.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              An advanced, evidence-informed learning experience covering MRI safety principles, risk assessment, implant screening, occupational safety,
              emergency response, and MRI department safety leadership.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="#curriculum" variant="secondary">
                <BookOpen className="h-4 w-4" aria-hidden /> Explore the Curriculum
              </LinkButton>
              <LinkButton href="/curriculum/m1/static-field/">
                Start Learning <ArrowRight className="h-4 w-4" aria-hidden />
              </LinkButton>
              <LinkButton href="/exam/?start=practice" variant="secondary">
                <ClipboardCheck className="h-4 w-4" aria-hidden /> Take the Safety Assessment
              </LinkButton>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6">
              {[
                [modules.length, "modules"],
                [allLessons.length, "lessons"],
                [questions.length, "bank questions"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="text-xs uppercase tracking-wider text-slate-400">{l}</dt>
                  <dd className="text-3xl font-bold text-white">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
        {media.hero && <p className="absolute bottom-2 right-3 text-[10px] text-slate-400">Photo: {media.hero.credit} ({media.hero.license})</p>}
      </section>

      {/* SIGNAGE STRIP */}
      <section aria-label="MR safety signage" className="border-y border-white/10 bg-navy-900/60">
        <Container className="py-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {signs.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <SafetySign kind={s} size={36} />
                <span className="text-xs font-medium text-slate-300">{signMeta[s].label}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* OVERVIEW + OBJECTIVES */}
      <section className="py-20" aria-labelledby="overview">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Course overview</p>
            <h2 id="overview" className="mt-2 text-3xl font-bold text-white">Built for the people who keep MR departments safe</h2>
            <p className="mt-4 text-slate-300">
              For MRI radiographers and technologists, radiologists, MR physicists, biomedical engineers, radiology nurses and department managers who need
              advanced, practical MR safety knowledge. {allLessons.length} lessons (~{Math.round(totalLessonMinutes / 60)} hours of reading), {labs.length}{" "}
              interactive simulations, {cases.length} worked cases and a scenario-based capstone.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: GraduationCap, t: "Structured curriculum", d: "14 modules from physics to leadership." },
                { icon: FlaskConical, t: "Learning laboratory", d: "Zones, screening, implants, RF, quench." },
                { icon: Target, t: "Examination centre", d: "Timed, randomised, with explanations." },
                { icon: ShieldCheck, t: "Referenced content", d: "Sources dated and flagged for verification." },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <Icon className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-white">{t}</p>
                    <p className="text-xs text-slate-400">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Card className="bg-gradient-to-br from-navy-800/80 to-navy-900/80">
            <h3 className="text-lg font-semibold text-white">Learning objectives</h3>
            <p className="text-sm text-slate-400">On completing the course you should be able to:</p>
            <ol className="mt-4 space-y-3">
              {objectives.map((o, i) => (
                <li key={o} className="flex gap-3 text-sm text-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-300">{i + 1}</span>
                  {o}
                </li>
              ))}
            </ol>
          </Card>
        </Container>
      </section>

      {/* MODULES */}
      <section id="curriculum" className="scroll-mt-20 border-t border-white/10 bg-navy-900/40 py-20" aria-labelledby="modules-title">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Curriculum</p>
              <h2 id="modules-title" className="mt-2 text-3xl font-bold text-white">Fourteen modules. One standard of care.</h2>
            </div>
            <LinkButton href="/curriculum/" variant="ghost">
              Full curriculum <ArrowRight className="h-4 w-4" aria-hidden />
            </LinkButton>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/curriculum/${m.id}/`}
                  className="group flex h-full flex-col rounded-2xl border border-white/10 bg-navy-900/70 p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-cyan-300">MODULE {String(m.number).padStart(2, "0")}</span>
                    <Badge>{m.topic}</Badge>
                  </div>
                  <p className="mt-3 font-semibold text-white group-hover:text-cyan-200">{m.title}</p>
                  <p className="mt-1 flex-1 text-sm text-slate-400">{m.tagline}</p>
                  <p className="mt-4 text-xs text-slate-500">
                    {m.lessons.length} lesson{m.lessons.length > 1 ? "s" : ""} · {m.lessons.reduce((s, l) => s + l.minutes, 0)} min
                    {m.labIds?.length ? ` · ${m.labIds.length} lab${m.labIds.length > 1 ? "s" : ""}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="py-20" aria-labelledby="dash-title">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Your dashboard</p>
            <h2 id="dash-title" className="mt-2 text-3xl font-bold text-white">See exactly where you stand</h2>
            <p className="mt-4 text-slate-300">
              Completion, quiz scores, topic performance, learning time and recommended next steps — updated as you learn. This demonstration stores progress
              in your browser only.
            </p>
            <LinkButton href="/dashboard/" className="mt-6">
              Open my dashboard <ArrowRight className="h-4 w-4" aria-hidden />
            </LinkButton>
          </div>
          <DashboardPreview />
        </Container>
      </section>

      {/* CASES */}
      <section className="border-t border-white/10 bg-navy-900/40 py-20" aria-labelledby="cases-title">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Featured case studies</p>
          <h2 id="cases-title" className="mt-2 text-3xl font-bold text-white">Reason through realistic incidents</h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {featured.map((c) => (
              <li key={c.id}>
                <Link href={`/cases/${c.id}/`} className="group block h-full rounded-2xl border border-white/10 bg-navy-900/70 p-6 transition hover:border-cyan-400/40">
                  <Badge tone="danger">Case {c.number}</Badge>
                  <p className="mt-3 font-semibold text-white group-hover:text-cyan-200">{c.title}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-400">{c.background}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan-300">
                    Work the case <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <LinkButton href="/cases/" variant="ghost" className="mt-6">
            All {cases.length} cases <ArrowRight className="h-4 w-4" aria-hidden />
          </LinkButton>
        </Container>
      </section>

      {/* ASSESSMENT PREVIEW */}
      <section className="py-20" aria-labelledby="assess-title">
        <Container className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Knowledge assessment</p>
            <h2 id="assess-title" className="mt-2 text-3xl font-bold text-white">Test reasoning, not recall</h2>
            <p className="mt-4 text-slate-300">
              Multiple choice, select-all-that-apply, true/false and clinical scenario questions with full explanations, timed and untimed modes, randomisation
              and topic analytics.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href="/exam/?start=practice">Start a practice assessment</LinkButton>
              <LinkButton href="/exam/" variant="secondary">Examination centre</LinkButton>
            </div>
          </div>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sample scenario question</p>
            <p className="mt-3 rounded-lg bg-white/5 p-3 text-sm italic text-slate-300">
              A patient arrests in the bore of a 1.5 T system. A colleague reaches for the magnet stop button &ldquo;so the crash team can come in&rdquo;.
            </p>
            <p className="mt-3 font-medium text-white">What is the best response?</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="rounded-lg border border-white/10 p-3 text-slate-300">A. Allow it — field removal helps the team.</li>
              <li className="rounded-lg border border-safe-500/50 bg-safe-500/10 p-3 text-slate-100">
                B. Stop them; remove the patient from Zone IV to resuscitate, with the team met at Zone III. ✓
              </li>
              <li className="rounded-lg border border-white/10 p-3 text-slate-300">C. Press emergency power off so the team can enter.</li>
            </ul>
          </Card>
        </Container>
      </section>

      {/* REFERENCES */}
      <section className="border-t border-white/10 bg-navy-900/40 py-20" aria-labelledby="refs-title">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">References &amp; professional guidance</p>
          <h2 id="refs-title" className="mt-2 text-3xl font-bold text-white">Anchored to authoritative sources</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            Every lesson cites its sources. Editions and dates are shown; items whose current edition must be confirmed are flagged. Local policy and
            manufacturer instructions always take precedence.
          </p>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {references
              .filter((r) => ["acr-manual-2024", "mhra-mri", "fda-labeling-guidance", "astm-f2503", "iec-60601-2-33", "hrs-2017"].includes(r.id))
              .map((r) => (
                <li key={r.id} className="rounded-xl border border-white/10 bg-navy-900/70 p-4">
                  <p className="text-sm font-semibold text-white">{r.title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {r.publisher} · {r.date}
                  </p>
                  {r.verify && <Badge tone="warn" className="mt-2">Verify current edition</Badge>}
                </li>
              ))}
          </ul>
          <LinkButton href="/resources/" variant="ghost" className="mt-6">
            Full resource library <ArrowRight className="h-4 w-4" aria-hidden />
          </LinkButton>
        </Container>
      </section>
    </>
  );
}
