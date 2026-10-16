import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, Container } from "@/components/ui";
import { ExamCentre } from "./ExamCentre";

export const metadata: Metadata = { title: "Examination Centre" };

export default function ExamPage() {
  return (
    <>
      <PageHeader eyebrow="Examination centre" title="Assess your MR safety reasoning">
        Practice assessments built from the question bank, and the scenario-based capstone. Randomised questions and options, timed or untimed, with full
        explanations and topic analytics.
      </PageHeader>
      <Container className="py-10">
        <Suspense fallback={<p className="text-slate-400">Loading examination centre…</p>}>
          <ExamCentre />
        </Suspense>
      </Container>
    </>
  );
}
