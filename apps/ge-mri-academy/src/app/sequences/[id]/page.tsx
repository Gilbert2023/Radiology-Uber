import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SEQUENCES, SEQ_BY_ID } from "@/content/sequences";
import { PARAM_BY_ID } from "@/content/parameters";
import { PageHeader, Section, RefList, BookmarkButton, CompleteButton, Track, Chip, Callout } from "@/components/ui";
import { PulseDiagram } from "@/components/PulseDiagram";

export function generateStaticParams() {
  return SEQUENCES.map((s) => ({ id: s.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: SEQ_BY_ID[id]?.name ?? "Sequence" };
}

const L = ({ items }: { items: string[] }) => <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">{items.map((i) => <li key={i}>{i}</li>)}</ul>;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = SEQ_BY_ID[id];
  if (!s) notFound();
  return (
    <article>
      <Track kind="sequence" id={s.id} label={s.name} href={`/sequences/${s.id}/`} />
      <PageHeader kicker={`Sequence Library · ${s.family}`} title={s.name} lede={s.principle}>
        <BookmarkButton k={`sequence:${s.id}`} />
        <CompleteButton k={`sequence:${s.id}`} />
      </PageHeader>
      <div className="mb-6 flex flex-wrap gap-2">
        <Chip tone={s.availability === "standard" ? "teal" : "amber"}>{s.availability}</Chip>
        {s.weighting.map((w) => <Chip key={w}>{w}</Chip>)}
      </div>
      <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
        <div>
          {s.diagram && s.diagram !== "none" && <div className="mb-8"><PulseDiagram kind={s.diagram} /></div>}
          <Section title="Naming: generic physics vs GE implementation">
            <div className="overflow-x-auto"><table className="table"><tbody>
              <tr><td className="w-40 font-medium">GE naming</td><td>{s.geNames}</td></tr>
              {s.otherVendors && <tr><td className="font-medium">Other vendors</td><td>{s.otherVendors}</td></tr>}
              <tr><td className="font-medium">Availability</td><td>{s.availability === "standard" ? "Standard on most clinical systems." : s.availability === "optional" ? "Optional — depends on configuration." : "Software/licence-dependent — verify on installed system."}</td></tr>
            </tbody></table></div>
          </Section>
          <Section title="Typical image appearance">
            <p className="text-sm text-ink-700">{s.appearance}</p>
            <div className="mt-3 overflow-x-auto"><table className="table"><tbody>
              <tr><td className="w-40 font-medium">Fat</td><td>{s.fat}</td></tr>
              <tr><td className="font-medium">Fluid</td><td>{s.fluid}</td></tr>
              <tr><td className="font-medium">Blood / flowing spins</td><td>{s.flow}</td></tr>
            </tbody></table></div>
          </Section>
          <div className="grid gap-6 sm:grid-cols-2">
            <Section title="Advantages"><L items={s.advantages} /></Section>
            <Section title="Limitations"><L items={s.limitations} /></Section>
            <Section title="Common artefacts"><L items={s.artefacts} /></Section>
            <Section title="Clinical applications"><L items={s.applications} /></Section>
          </div>
          {s.safety && <Section title="Safety / contrast considerations"><Callout tone="safety">{s.safety}</Callout></Section>}
          <Section title="Sources"><RefList refs={s.refs} /></Section>
        </div>
        <aside className="space-y-4">
          <div className="panel panel-pad">
            <div className="kicker mb-2">Critical parameters</div>
            <ul className="space-y-1 text-sm">{s.criticalParams.map((p) => PARAM_BY_ID[p] && <li key={p}><Link href={`/parameters/${p}/`}>{PARAM_BY_ID[p].label}</Link></li>)}</ul>
          </div>
          {s.alternatives.length > 0 && (
            <div className="panel panel-pad">
              <div className="kicker mb-2">Alternative sequences</div>
              <ul className="space-y-1 text-sm">{s.alternatives.map((a) => SEQ_BY_ID[a] && <li key={a}><Link href={`/sequences/${a}/`}>{SEQ_BY_ID[a].name}</Link></li>)}</ul>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
