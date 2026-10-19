import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { PageHeader, Section, Callout } from "@/components/ui";
import { ConsoleDiagram, SequenceSelectDiagram } from "./ConsoleDiagram";

export const metadata: Metadata = { title: "Console Walkthrough" };

function findScreenshot(n: 1 | 2): string | null {
  const dir = path.join(process.cwd(), "public", "console");
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const f = `screenshot-${n}.${ext}`;
    if (fs.existsSync(path.join(dir, f))) return `/console/${f}`;
  }
  return null;
}

function Screenshot({ n, caption }: { n: 1 | 2; caption: string }) {
  const src = findScreenshot(n);
  return (
    <figure className="panel overflow-hidden">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={caption} className="w-full bg-ink-900" />
      ) : (
        <div className="grid aspect-[16/9] place-items-center bg-paper-200 p-6 text-center text-sm text-ink-500">
          <div>
            <p className="font-medium text-ink-700">Original screenshot {n} not yet added to this build</p>
            <p className="mt-1">Place the file at <code className="font-mono">public/console/screenshot-{n}.png</code> and rebuild — it will appear here automatically.</p>
          </div>
        </div>
      )}
      <figcaption className="border-t border-rule px-4 py-2 text-xs text-ink-600">Screenshot {n}: {caption} Supplied by the course owner for educational reference. Labels and availability differ by software release, installed options, coil and sequence.</figcaption>
    </figure>
  );
}

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="Phase 2 · Screenshot-based walkthrough"
        title="Console Walkthrough"
        lede="Two GE console views are used as the reference for this academy: the sequence-selection screen and an axial FRFSE T2 prescription screen. Below each original screenshot is an annotated learning diagram — select any field to open its full lesson."
      />
      <div className="mb-8"><Callout tone="warn" title="Reference, not replica">
        The diagrams below re-draw selected console regions as teaching aids. They are not a reproduction of GE software, they do not show real values from a patient study, and field positions may differ on your system.
      </Callout></div>

      <Section title="Screenshot 1 — Sequence selection" kicker="Sequence families and imaging options">
        <div className="grid gap-6 xl:grid-cols-2">
          <Screenshot n={1} caption="GE sequence-selection interface showing families such as Fast Spin Echo, Gradient Echo, Spin Echo, Spiral, Vascular, FSE, PROPELLER and SSFSE." />
          <SequenceSelectDiagram />
        </div>
      </Section>

      <Section title="Screenshot 2 — Axial FRFSE T2 prescription" kicker="Scan parameters">
        <div className="mb-6"><Screenshot n={2} caption="GE MRI console for an axial FRFSE T2 sequence." /></div>
        <ConsoleDiagram />
      </Section>

      <Section title="How to read a prescription screen">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-700">
          <li><strong>Geometry first</strong> — plane, frequency direction, FOV, phase FOV, thickness, spacing and start/end define <em>where</em> and <em>how finely</em> you image.</li>
          <li><strong>Timing defines contrast</strong> — TR, TE, ETL and preparation options decide the weighting.</li>
          <li><strong>Resolution and SNR are a budget</strong> — matrix, NEX and bandwidth trade detail, noise and time. Watch Relative SNR, Pixel Size and scan time update together.</li>
          <li><strong>Information fields are feedback</strong> — Bandwidth/Pixel, Echo Spacing, Min/Max TE and SAR/B1-related values tell you the consequence of your choices. Read them after every change.</li>
          <li><strong>Options carry hidden costs</strong> — fat sat, flow comp and NPW change slices per TR, TE or time. See <Link href="/advanced/">Beyond the Screenshot</Link>.</li>
        </ol>
      </Section>
    </>
  );
}
