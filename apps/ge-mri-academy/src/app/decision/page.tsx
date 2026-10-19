import type { Metadata } from "next";
import { PageHeader, Callout } from "@/components/ui";
import { DecisionAssistant } from "./DecisionAssistant";

export const metadata: Metadata = { title: "Protocol Decision Assistant" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Learning aid" title="Protocol Decision Assistant" lede="Choose the clinical scenario, patient factors and scanner capability. The assistant builds an educational protocol from the library and explains why each sequence is included and how it was adapted." />
      <div className="mb-6"><Callout tone="safety" title="Not an autonomous clinical prescription">The output is a learning aid. The final protocol must be verified against local policy, radiologist instructions, current manufacturer guidance and patient-specific safety screening.</Callout></div>
      <DecisionAssistant />
    </>
  );
}
