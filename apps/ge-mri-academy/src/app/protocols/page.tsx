import type { Metadata } from "next";
import { PageHeader, Callout } from "@/components/ui";
import { ProtocolIndex } from "./ProtocolIndex";

export const metadata: Metadata = { title: "Clinical Protocol Library" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Phase 5" title="Clinical Protocol Library" lede="Structured, searchable educational protocols. Protocols change with the clinical question, patient condition, coil, software, available options, radiologist preference and local policy — there is no universal protocol." />
      <div className="mb-6"><Callout tone="warn" title="Educational reference ranges">Suggested parameter ranges are typical educational values for a 1.5 T system, not validated GE presets. Start from your department&apos;s approved protocol.</Callout></div>
      <ProtocolIndex />
    </>
  );
}
