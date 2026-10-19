import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TROUBLESHOOTING } from "@/content/troubleshooting";
import { PARAM_BY_ID } from "@/content/parameters";
import { PageHeader, Track, BookmarkButton, Callout, Chip } from "@/components/ui";

export function generateStaticParams() {
  return TROUBLESHOOTING.map((t) => ({ id: t.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: TROUBLESHOOTING.find((t) => t.id === id)?.title ?? "Troubleshooting" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = TROUBLESHOOTING.find((x) => x.id === id);
  if (!t) notFound();
  const steps: { title: string; body: React.ReactNode; tone?: "safety" }[] = [
    { title: "Observe", body: <p>{t.observe}</p> },
    { title: "Identify possible causes", body: <ul className="list-disc pl-5">{t.causes.map((c) => <li key={c}>{c}</li>)}</ul> },
    { title: "Check the image and console", body: <ul className="list-disc pl-5">{t.check.map((c) => <li key={c}>{c}</li>)}</ul> },
    { title: "Prioritise safe actions", body: <ul className="list-disc pl-5">{t.safeActions.map((c) => <li key={c}>{c}</li>)}</ul>, tone: "safety" },
    { title: "Adjust parameters if appropriate", body: <ul className="list-disc pl-5">{t.adjust.map((c) => <li key={c}>{c}</li>)}</ul> },
    { title: "Reacquire if justified", body: <p>{t.reacquire}</p> },
    { title: "Verify image quality", body: <ul className="list-disc pl-5">{t.verify.map((c) => <li key={c}>{c}</li>)}</ul> },
    { title: "Document / escalate", body: <p>{t.escalate}</p> },
  ];
  return (
    <article>
      <Track kind="troubleshooting" id={t.id} label={t.title} href={`/troubleshooting/${t.id}/`} />
      <PageHeader kicker={`Troubleshooting · ${t.category}`} title={t.title}><BookmarkButton k={`troubleshooting:${t.id}`} /></PageHeader>
      <ol className="relative space-y-4 border-l-2 border-rule pl-6">
        {steps.map((s, i) => (
          <li key={s.title} className="relative">
            <span className={`absolute -left-[2.15rem] grid h-7 w-7 place-items-center rounded-full border-2 bg-white font-mono text-xs ${s.tone ? "border-signal-red text-signal-red" : "border-ink-700 text-ink-800"}`}>{i + 1}</span>
            <div className={`panel panel-pad text-sm text-ink-700 ${s.tone ? "border-signal-red/40" : ""}`}>
              <h2 className="mb-1 font-semibold text-ink-900">{s.title}</h2>
              {s.body}
            </div>
          </li>
        ))}
      </ol>
      {t.pathologyVsArtefact && <div className="mt-6"><Callout tone="info" title="True pathology or artefact?">{t.pathologyVsArtefact}</Callout></div>}
      {t.params.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm"><span className="kicker">Related parameters</span>{t.params.map((p) => PARAM_BY_ID[p] && <Link key={p} href={`/parameters/${p}/`}><Chip tone="teal">{PARAM_BY_ID[p].label}</Chip></Link>)}</div>
      )}
      <div className="mt-6"><Callout tone="safety">Never override scanner interlocks, bypass safety controls, ignore warnings, or scan an implant whose MR conditions have not been verified.</Callout></div>
    </article>
  );
}
