import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PARAMETERS, PARAM_BY_ID } from "@/content/parameters";
import { PageHeader, VerificationBadge, Section, RefList, BookmarkButton, CompleteButton, Track, Callout, Chip } from "@/components/ui";

export function generateStaticParams() {
  return PARAMETERS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: PARAM_BY_ID[id]?.label ?? "Parameter" };
}

const EFFECT_LABEL: Record<string, string> = { snr: "SNR", resolution: "Spatial resolution", time: "Scan time", contrast: "Contrast", blurring: "Blurring", artefacts: "Artefacts", sar: "SAR / RF" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = PARAM_BY_ID[id];
  if (!p) notFound();
  const idx = PARAMETERS.findIndex((x) => x.id === id);
  const prev = PARAMETERS[idx - 1];
  const next = PARAMETERS[idx + 1];
  const href = `/parameters/${p.id}/`;

  return (
    <article>
      <Track kind="parameter" id={p.id} label={p.label} href={href} />
      <PageHeader kicker={`Parameter Academy · ${p.group}`} title={p.label} lede={p.definition}>
        <BookmarkButton k={`parameter:${p.id}`} />
        <CompleteButton k={`parameter:${p.id}`} />
      </PageHeader>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <VerificationBadge v={p.verification} />
        {p.aka?.map((a) => <Chip key={a}>{a}</Chip>)}
      </div>

      <ol className="mb-8 grid gap-px overflow-hidden rounded-md border border-rule bg-rule text-xs sm:grid-cols-6" aria-label="Teaching sequence">
        {["Parameter", "Physics", "Image appearance", "Clinical consequence", "Adjustment strategy", "Pitfalls"].map((s, i) => (
          <li key={s} className="bg-white px-3 py-2"><a href={`#step-${i}`} className="text-ink-700"><span className="font-mono text-ink-400">{i + 1}</span> {s}</a></li>
        ))}
      </ol>

      <div className="grid gap-8 xl:grid-cols-[1fr_18rem]">
        <div className="prose-clinical">
          <Section id="step-0" kicker="1 · Parameter" title="Definition">
            <p>{p.definition}</p>
          </Section>
          <Section id="step-1" kicker="2 · Physics" title="What changes physically">
            <p>{p.physics}</p>
          </Section>
          <Section id="step-2" kicker="3 · Image appearance" title="What you see">
            <p>{p.appearance}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="panel panel-pad"><div className="kicker mb-1">Increasing</div><p className="text-sm">{p.increase}</p></div>
              <div className="panel panel-pad"><div className="kicker mb-1">Decreasing</div><p className="text-sm">{p.decrease}</p></div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="table">
                <thead><tr><th>Effect on</th><th>Behaviour</th></tr></thead>
                <tbody>
                  {Object.entries(p.effects).map(([k, v]) => (
                    <tr key={k}><td className="whitespace-nowrap font-medium">{EFFECT_LABEL[k]}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
          <Section id="step-3" kicker="4 · Clinical consequence" title="When it matters clinically">
            <p>{p.clinical}</p>
          </Section>
          <Section id="step-4" kicker="5 · Adjustment strategy" title="Practical adjustment example">
            <p>{p.example}</p>
            <div className="panel panel-pad mt-4">
              <div className="kicker mb-1">Troubleshooting scenario</div>
              <p className="font-medium text-ink-900">{p.troubleshooting.scenario}</p>
              <p className="mt-1 text-sm">{p.troubleshooting.approach}</p>
            </div>
          </Section>
          <Section id="step-5" kicker="6 · Pitfalls" title="Common mistakes">
            <ul className="list-disc space-y-1 pl-5">{p.mistakes.map((m) => <li key={m}>{m}</li>)}</ul>
          </Section>
          <Section title="System-specific limitations">
            <Callout tone="warn" title="Verify on the installed software version">{p.systemNotes}</Callout>
          </Section>
          <Section title="Sources">
            <RefList refs={p.refs} />
          </Section>
        </div>
        <aside className="space-y-4">
          <div className="panel panel-pad">
            <div className="kicker mb-2">Interacts with</div>
            <p className="mb-3 text-sm text-ink-600">{p.interactionNotes}</p>
            <ul className="space-y-1 text-sm">
              {p.interactions.map((i) => PARAM_BY_ID[i] && <li key={i}><Link href={`/parameters/${i}/`}>{PARAM_BY_ID[i].label}</Link></li>)}
            </ul>
          </div>
          <div className="panel panel-pad text-sm">
            <div className="kicker mb-2">Try it</div>
            <p className="text-ink-600">Explore this trade-off in the <Link href="/simulator/">Console Simulator</Link>.</p>
          </div>
        </aside>
      </div>

      <nav className="mt-10 flex justify-between border-t border-rule pt-4 text-sm" aria-label="Parameter navigation">
        {prev ? <Link href={`/parameters/${prev.id}/`}>← {prev.label}</Link> : <span />}
        {next ? <Link href={`/parameters/${next.id}/`}>{next.label} →</Link> : <span />}
      </nav>
    </article>
  );
}
