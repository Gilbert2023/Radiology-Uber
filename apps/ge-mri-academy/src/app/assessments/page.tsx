import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { Assessments } from "./Assessments";

export const metadata: Metadata = { title: "Assessments & Examinations" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Phase 7" title="Assessments & Examinations" lede="Topic practice with immediate explanations, or a timed mock examination with review of incorrect answers. Question order is randomised; answers are saved in this browser." />
      <Assessments />
    </>
  );
}
