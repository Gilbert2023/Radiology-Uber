import type { Metadata } from "next";
import { PageHeader, Callout } from "@/components/ui";
import { ImageCompare } from "./ImageCompare";
import { AnatomyPlanes } from "./AnatomyPlanes";

export const metadata: Metadata = { title: "Image Interpretation & Sequence Comparison" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Image library" title="Image Interpretation & Sequence Comparison" lede="Switch between sequences or drag the comparison slider. All images on this page are generated from a synthetic digital phantom or drawn as labelled illustrations — none are patient studies." />
      <div className="mb-6"><Callout tone="warn" title="About real clinical images">Licensed clinical MRI examples are not yet bundled with this build. To add them, place appropriately licensed, de-identified images in <code className="font-mono">public/images/</code> and record source and licence in <code className="font-mono">src/content/imageCredits.ts</code> (see README). Never add images containing patient identifiers.</Callout></div>
      <ImageCompare />
      <AnatomyPlanes />
    </>
  );
}
