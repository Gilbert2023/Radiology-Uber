import type { Metadata } from "next";
import { ADVANCED } from "@/content/advanced";
import { PageHeader, VerificationBadge, RefList, Callout } from "@/components/ui";

export const metadata: Metadata = { title: "Beyond the Screenshot: Advanced GE MRI Parameters" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Hidden and advanced parameters" title="Beyond the Screenshot: Advanced GE MRI Parameters" lede="Settings that may live in tabs such as Details, Acceleration, Advanced, Coil, Contrast, Prescription, Geometry or Recon. Each entry states how confident we are about its GE implementation." />
      <div className="mb-6"><Callout tone="warn" title="We do not invent menu locations">Where a control&apos;s location could not be confirmed from the supplied screenshots, the likely function is explained and the location is marked as software-dependent. Confirm in the Operator Manual / Learning &amp; Reference for your release.</Callout></div>
      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <VerificationBadge v="console" /> <span className="self-center text-ink-500">visible on the supplied console</span>
        <VerificationBadge v="standard" /> <span className="self-center text-ink-500">universal MRI concept</span>
        <VerificationBadge v="ge-plausible" /> <span className="self-center text-ink-500">plausible GE implementation, unverified</span>
        <VerificationBadge v="verify" /> <span className="self-center text-ink-500">requires the exact software manual</span>
      </div>
      <div className="space-y-4">
        {ADVANCED.map((a) => (
          <details key={a.id} id={a.id} className="panel group scroll-mt-20">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="font-semibold text-ink-900">{a.name}</span>
              <VerificationBadge v={a.verification} />
            </summary>
            <div className="space-y-3 border-t border-rule px-4 py-4 text-sm text-ink-700">
              <p>{a.summary}</p>
              <p><strong>Physics:</strong> {a.physics}</p>
              <p><strong>In practice:</strong> {a.practice}</p>
              <p className="text-ink-600"><strong>Likely location:</strong> {a.likelyLocation}</p>
              {a.caution && <Callout tone="safety">{a.caution}</Callout>}
              <RefList refs={a.refs} />
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
