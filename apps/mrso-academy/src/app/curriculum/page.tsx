import type { Metadata } from "next";
import { PageHeader, Container } from "@/components/ui";
import { CurriculumBrowser } from "./CurriculumBrowser";

export const metadata: Metadata = { title: "Curriculum" };

export default function CurriculumPage() {
  return (
    <>
      <PageHeader eyebrow="Curriculum" title="Advanced MRSO Curriculum">
        Fourteen modules organised from physics foundations to safety leadership. Search across every lesson, expand modules to see lessons, and track
        completion as you go.
      </PageHeader>
      <Container className="py-10">
        <CurriculumBrowser />
      </Container>
    </>
  );
}
