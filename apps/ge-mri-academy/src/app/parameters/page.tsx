import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ParameterIndex } from "./ParameterIndex";

export const metadata: Metadata = { title: "GE Console Parameter Academy" };

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="Phase 2 · Parameter dictionary"
        title="GE Console Parameter Academy"
        lede={<>Every parameter is taught in the same order: <strong>Parameter → Physics → Image appearance → Clinical consequence → Adjustment strategy → Pitfalls</strong>. Badges show whether a label is visible on the supplied console, a standard MRI concept, or a GE implementation that must be verified on your software release.</>}
      />
      <ParameterIndex />
    </>
  );
}
