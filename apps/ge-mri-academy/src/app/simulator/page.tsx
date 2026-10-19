import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, Callout } from "@/components/ui";
import { Simulator } from "./Simulator";

export const metadata: Metadata = { title: "Interactive Console Simulator" };

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="Phase 3 · Educational simulator"
        title="Interactive Console Simulator"
        lede="Change one parameter at a time and watch scan time, relative SNR, resolution, contrast and artefact risk respond. The synthetic phantom image is generated from simplified signal equations and passed through k-space."
      />
      <div className="mb-6">
        <Callout tone="safety" title="Educational approximation — not a GE scanner prediction">
          Equations are simplified textbook relationships (labelled under each output). The simulator does not calculate SAR, B1+rms, RF safety or exact acquisition time, and no configuration here is suitable for direct clinical use. Always rely on the scanner&apos;s own displays and local protocols.
        </Callout>
      </div>
      <Suspense fallback={<p className="text-sm text-ink-500">Loading simulator…</p>}>
        <Simulator />
      </Suspense>
    </>
  );
}
