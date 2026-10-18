import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cases } from "@/content/cases";
import { Badge, Callout, Container, PageHeader } from "@/components/ui";
import { ReferenceList } from "@/components/ReferenceList";
import { CaseWalkthrough } from "../CaseClient";

export function generateStaticParams() {
  return cases.map((c) => ({ caseId: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ caseId: string }> }): Promise<Metadata> {
  const { caseId } = await params;
  return { title: cases.find((c) => c.id === caseId)?.title ?? "Case" };
}

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const idx = cases.findIndex((c) => c.id === caseId);
  if (idx < 0) notFound();
  const c = cases[idx];
  const next = cases[idx + 1];
  return (
    <>
      <PageHeader eyebrow={`Case study ${c.number} · ${c.topic}`} title={c.title}>
        <Link href="/cases/" className="text-sm text-cyan-300 hover:underline">← All cases</Link>
      </PageHeader>
      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-5">
            <h2 className="font-semibold text-white">Clinical background</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{c.background}</p>
          </section>
          <CaseWalkthrough c={c} />
          {next && (
            <Link href={`/cases/${next.id}/`} className="block rounded-xl border border-white/10 p-4 text-sm hover:bg-white/5">
              <span className="text-xs text-slate-400">Next case</span>
              <span className="block text-white">{next.title}</span>
            </Link>
          )}
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
            <h2 className="text-sm font-semibold text-white">Assumptions</h2>
            <p className="mt-1 text-sm text-slate-300">{c.assumptions}</p>
          </div>
          <Callout tone="warning" title="When to escalate">
            {c.escalation}
          </Callout>
          <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
            <h2 className="text-sm font-semibold text-white">References</h2>
            <div className="mt-3">
              <ReferenceList ids={c.references} compact />
            </div>
          </div>
          <Badge>No universal rule — apply local policy</Badge>
        </aside>
      </Container>
    </>
  );
}
