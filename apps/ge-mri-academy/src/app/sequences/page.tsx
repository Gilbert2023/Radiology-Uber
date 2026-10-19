import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { SequenceIndex } from "./SequenceIndex";

export const metadata: Metadata = { title: "Sequence Library" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Phase 4" title="Sequence Library" lede="Generic sequence physics first, then GE product naming. Availability labels indicate whether a technique is standard, optional or depends on software/licence." />
      <SequenceIndex />
    </>
  );
}
