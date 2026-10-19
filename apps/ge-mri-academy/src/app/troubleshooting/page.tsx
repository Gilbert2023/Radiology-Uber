import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { TroubleIndex } from "./TroubleIndex";

export const metadata: Metadata = { title: "Practical Troubleshooting Centre" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Phase 6" title="Practical Troubleshooting Centre" lede={<>Every scenario follows the same framework: <strong>Observe → Identify possible causes → Check the image and console → Prioritise safe actions → Adjust parameters if appropriate → Reacquire if justified → Verify image quality → Document / escalate.</strong> Scanner interlocks, safety controls and implant conditions are never overridden.</>} />
      <TroubleIndex />
    </>
  );
}
