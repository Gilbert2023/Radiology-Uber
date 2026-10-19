import type { Metadata } from "next";
import { SAFETY } from "@/content/safety";
import { PageHeader, Callout, RefList } from "@/components/ui";

export const metadata: Metadata = { title: "MRI Safety & Clinical Governance" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Safety and governance" title="MRI Safety & Clinical Governance" lede="Principles for safe practice. Local MR safety policy, the MR Responsible Person / MR Safety Expert and manufacturer instructions always take precedence." />
      <div className="mb-8 space-y-3">
        <Callout tone="safety" title="Never">Override scanner interlocks · bypass safety controls · ignore warnings · scan an implant without verifying its MR conditions · treat a simulated configuration as safe for clinical use.</Callout>
        <Callout tone="info">This platform supplements, but does not replace, manufacturer instructions, institutional protocols, radiologist direction, MRI safety procedures or professional judgement.</Callout>
      </div>
      <nav className="panel panel-pad mb-8" aria-label="Safety topics"><ul className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">{SAFETY.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ul></nav>
      <div className="grid gap-5 lg:grid-cols-2">
        {SAFETY.map((s) => (
          <section key={s.id} id={s.id} className="panel panel-pad scroll-mt-20">
            <h2 className="mb-2 font-serif text-lg font-semibold">{s.title}</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-700">{s.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <div className="mt-3"><RefList refs={s.refs.map((id) => ({ id }))} /></div>
          </section>
        ))}
      </div>
    </>
  );
}
