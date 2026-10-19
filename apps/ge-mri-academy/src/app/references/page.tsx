import type { Metadata } from "next";
import { REFERENCES, LAST_REVIEWED, CONTENT_VERSION } from "@/content/references";
import { PageHeader, Section, Chip } from "@/components/ui";

export const metadata: Metadata = { title: "References & Governance" };

export default function Page() {
  const kinds = Array.from(new Set(REFERENCES.map((r) => r.kind)));
  return (
    <>
      <PageHeader kicker="Evidence and governance" title="References & Governance" lede={<>Content version {CONTENT_VERSION} · last reviewed {LAST_REVIEWED}. Only published sources are cited; where a guideline is revised periodically, check the current version.</>} />
      <Section title="How content is classified">
        <div className="overflow-x-auto"><table className="table"><tbody>
          <tr><td className="w-56 font-medium">Universal MRI physics</td><td>Vendor-neutral relationships (e.g. SNR ∝ √NEX). Sourced from textbooks and primary literature.</td></tr>
          <tr><td className="font-medium">Typical educational ranges</td><td>Indicative 1.5 T values for teaching. Not validated GE presets.</td></tr>
          <tr><td className="font-medium">Manufacturer-specific behaviour</td><td>Labelled “On supplied console” (seen on the provided screenshots) or “GE implementation — verify”. Confirm with GE HealthCare documentation for your release.</td></tr>
          <tr><td className="font-medium">Institution-specific protocols</td><td>Your department&apos;s approved protocols always take precedence.</td></tr>
          <tr><td className="font-medium">Patient-specific decisions</td><td>Made by the responsible radiographer/radiologist with safety screening; never by this platform.</td></tr>
        </tbody></table></div>
      </Section>
      <Section title="Updating content">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-700">
          <li>All content lives in typed files under <code className="font-mono">src/content/</code> (parameters, sequences, protocols, cases, questions, references).</li>
          <li>Edit the relevant record, cite a reference id from <code className="font-mono">references.ts</code>, and bump <code className="font-mono">LAST_REVIEWED</code> / <code className="font-mono">CONTENT_VERSION</code>.</li>
          <li>Run <code className="font-mono">npm test</code> — content validation checks every cross-link and reference id.</li>
          <li>Changes to protocols or safety content require review by a qualified MRI radiographer and radiologist (and MR Safety Expert for safety content) before release.</li>
        </ol>
        <p className="mt-3 text-sm text-ink-600">Clinical peer review of this initial content set is still required before use in formal teaching.</p>
      </Section>
      {kinds.map((k) => (
        <Section key={k} title={k}>
          <ol className="space-y-2 text-sm text-ink-700">
            {REFERENCES.filter((r) => r.kind === k).map((r) => (
              <li key={r.id} id={`ref-${r.id}`} className="scroll-mt-20">
                {r.citation} {r.url && <a href={r.url} target="_blank" rel="noreferrer">link</a>}
                {r.note && <div className="text-xs text-ink-500">{r.note}</div>}
                <Chip>{r.id}</Chip>
              </li>
            ))}
          </ol>
        </Section>
      ))}
      <Section title="Image credits">
        <p className="text-sm text-ink-700">All images in this build are generated from a synthetic digital phantom or drawn as labelled SVG illustrations by the platform. The two GE console screenshots, when added to <code className="font-mono">public/console/</code>, are supplied by the course owner for educational reference. GE, SIGNA and product names are trademarks of their respective owners; this platform is not affiliated with GE HealthCare.</p>
      </Section>
    </>
  );
}
