import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { ResourceLibrary } from "./ResourceLibrary";

export const metadata: Metadata = { title: "Resources & References" };

export default function ResourcesPage() {
  return (
    <>
      <PageHeader eyebrow="Resources and references" title="Resource library & bibliography">
        Authoritative guidance, standards, literature and downloadable templates. Publication or revision dates are shown as known in October 2026; items flagged
        for verification must be checked against the issuing body&apos;s latest edition before use.
      </PageHeader>
      <Container className="py-10">
        <ResourceLibrary />
      </Container>
    </>
  );
}
