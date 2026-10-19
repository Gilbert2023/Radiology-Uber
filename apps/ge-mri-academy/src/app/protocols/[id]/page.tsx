import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROTOCOLS, PROTOCOL_BY_ID } from "@/content/protocols";
import { PageHeader, Section, RefList, BookmarkButton, Track, Chip, Callout } from "@/components/ui";
import { SaveProtocolButton, PrintButton } from "./ProtocolActions";

export function generateStaticParams() {
  return PROTOCOLS.map((p) => ({ id: p.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: PROTOCOL_BY_ID[id]?.title ?? "Protocol" };
}

const L = ({ items }: { items: string[] }) => <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">{items.map((i) => <li key={i}>{i}</li>)}</ul>;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = PROTOCOL_BY_ID[id];
  if (!p) notFound();
  const core = p.sequences.filter((s) => !s.optional);
  const optional = p.sequences.filter((s) => s.optional);
  const n = (i: number) => <span className="mr-2 font-mono text-ink-400">{String(i).padStart(2, "0")}</span>;
  return (
    <article>
      <Track kind="protocol" id={p.id} label={p.title} href={`/protocols/${p.id}/`} />
      <PageHeader kicker={`Protocol Library · ${p.region}`} title={p.title} lede={p.indication}>
        <SaveProtocolButton id={p.id} />
        <BookmarkButton k={`protocol:${p.id}`} />
        <PrintButton />
      </PageHeader>
      <div className="mb-6 flex flex-wrap gap-2">{p.tags.map((t) => <Chip key={t}>{t}</Chip>)}<Chip tone={p.depth === "full" ? "green" : "neutral"}>{p.depth === "full" ? "Full protocol page" : "Core protocol page"}</Chip></div>
      <div className="mb-8"><Callout tone="safety" title="Learning aid — not a clinical prescription">Verify against local policy, radiologist instructions, current GE HealthCare guidance for the installed software, and patient-specific MRI safety screening.</Callout></div>

      <Section title={<>{n(1)}Clinical indication and diagnostic objective</>}><p className="text-sm text-ink-700">{p.indication}</p></Section>
      <Section title={<>{n(2)}Key anatomy and pathology to demonstrate</>}><p className="text-sm text-ink-700">{p.anatomy}</p></Section>
      <Section title={<>{n(3)}Patient preparation and screening</>}><L items={p.preparation} /></Section>
      <Section title={<>{n(4)}Positioning and coil selection</>}><p className="text-sm text-ink-700"><strong>Positioning:</strong> {p.positioning}</p><p className="mt-1 text-sm text-ink-700"><strong>Coil:</strong> {p.coil}</p></Section>
      <Section title={<>{n(5)}Localiser and planning strategy</>}><L items={p.planning} /></Section>
      <Section title={<>{n(6)}Core sequences in acquisition order · {n(8)}suggested educational parameter ranges</>}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>#</th><th>Sequence</th><th>Plane</th><th>Diagnostic purpose</th><th>Suggested ranges (educational)</th></tr></thead>
            <tbody>{core.map((s, i) => (
              <tr key={s.name + i}><td className="font-mono text-ink-400">{i + 1}</td><td className="font-medium">{s.name}{s.postContrast && <span className="ml-1"><Chip tone="amber">+C</Chip></span>}</td><td>{s.plane}</td><td>{s.purpose}</td><td className="text-xs text-ink-600">{s.params ?? "Per local protocol"}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Section>
      <Section title={<>{n(7)}Imaging planes and coverage</>}><p className="text-sm text-ink-700">{p.coverage}</p></Section>
      <Section title={<>{n(9)}Optional sequences and when to add them</>}>
        {optional.length ? (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>Sequence</th><th>Add when</th><th>Purpose</th></tr></thead><tbody>{optional.map((s) => <tr key={s.name}><td className="font-medium">{s.name}{s.postContrast && <span className="ml-1"><Chip tone="amber">+C</Chip></span>}</td><td>{s.when}</td><td>{s.purpose}</td></tr>)}</tbody></table></div>
        ) : <p className="text-sm text-ink-500">No routine optional sequences listed; add only on radiologist request.</p>}
      </Section>
      <Section title={<>{n(10)}Contrast: indications, contraindications and timing principles</>}><p className="text-sm text-ink-700">{p.contrast}</p><p className="mt-2 text-xs text-ink-500">Contrast screening, agent choice and dose follow local policy (see MRI Safety). There is no universal post-injection delay: timing depends on the sequence, organ and clinical question.</p></Section>
      <Section title={<>{n(11)}Respiratory or cardiac synchronisation</>}><p className="text-sm text-ink-700">{p.synchronisation ?? "Not routinely required."}</p></Section>
      <Section title={<>{n(12)}Common mistakes and corrective actions</>}>
        <div className="overflow-x-auto"><table className="table"><thead><tr><th>Mistake</th><th>Corrective action</th></tr></thead><tbody>{p.mistakes.map((m) => <tr key={m.mistake}><td>{m.mistake}</td><td>{m.fix}</td></tr>)}</tbody></table></div>
      </Section>
      <Section title={<>{n(13)}Artefacts that can mimic disease</>}><L items={p.mimics} /></Section>
      <Section title={<>{n(14)}Quality-control checkpoints before the patient leaves</>}>
        <ul className="space-y-1 text-sm text-ink-700">{p.qc.map((q) => <li key={q} className="flex gap-2"><span aria-hidden>☐</span>{q}</li>)}</ul>
      </Section>
      <Section title={<>{n(15)}Alternative protocol if the standard examination is not tolerated</>}><p className="text-sm text-ink-700">{p.alternative}</p></Section>
      <Section title={<>{n(16)}Limitations and escalation criteria</>}><p className="text-sm text-ink-700">{p.limitations}</p></Section>
      <Section title={<>{n(17)}Sources and evidence date</>}><p className="mb-2 text-xs text-ink-500">{p.evidenceDate}</p><RefList refs={p.refs} /></Section>
    </article>
  );
}
