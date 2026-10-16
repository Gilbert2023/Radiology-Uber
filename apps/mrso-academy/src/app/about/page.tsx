import type { Metadata } from "next";
import { Callout, Card, Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "About, limitations & credits" };

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title="About this platform" />
      <Container className="grid gap-6 py-10 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-white">Purpose and audience</h2>
          <p className="mt-2 text-sm text-slate-300">
            An advanced educational resource for MRI radiographers and technologists, radiologists, MR physicists, biomedical engineers, radiology nurses and MRI
            department managers. Content is written for professionals who already work in, or are preparing to lead, MR services.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold text-white">Status and accreditation</h2>
          <p className="mt-2 text-sm text-slate-300">
            This platform has no accreditation, endorsement or approval from any professional body, regulator or certification board. The course completion
            record is distinct from any externally recognised MRSO or MRSE credential and does not qualify anyone for a designated safety role.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold text-white">Clinical accuracy</h2>
          <p className="mt-2 text-sm text-slate-300">
            Content was written against sources available in October 2026 and cites them in each lesson. Where an edition or status could not be confirmed it is
            flagged &ldquo;verify&rdquo;. Lab devices and numeric values are fictional or illustrative unless a source is cited. Always apply current guidance, local
            policy and manufacturer instructions; this site never overrides them.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold text-white">Demonstration limitations</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>No user accounts or server database: progress is stored in this browser&apos;s localStorage only.</li>
            <li>Progress does not sync across devices and can be cleared or edited by the user.</li>
            <li>Completion records cannot be verified by third parties.</li>
            <li>No instructor dashboard, cohort reporting or LMS (SCORM/xAPI) integration yet.</li>
            <li>Imagery is original illustration; licensed photography can be configured (see README).</li>
          </ul>
        </Card>
        <div className="lg:col-span-2">
          <Callout tone="danger" title="Emergencies">
            In a real emergency follow your local emergency procedure and the manufacturer&apos;s instructions. Simulations here are simplified for learning.
          </Callout>
        </div>
      </Container>
    </>
  );
}
