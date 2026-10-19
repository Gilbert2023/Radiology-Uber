import type { Metadata } from "next";
import { CASES } from "@/content/cases";
import { PageHeader, Card, Chip } from "@/components/ui";

export const metadata: Metadata = { title: "Clinical Case Simulator" };

export default function Page() {
  const levels = ["Beginner", "Intermediate", "Advanced"] as const;
  return (
    <>
      <PageHeader kicker="Phase 6" title="Clinical Case Simulator" lede="Cases reveal information progressively. Make protocol, sequence and parameter decisions, get immediate feedback and an expert explanation. Cases teach technical reasoning — diagnosis remains the radiologist's responsibility." />
      {levels.map((l) => (
        <section key={l} className="mb-8">
          <h2 className="mb-3 font-serif text-lg font-semibold">{l}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CASES.filter((c) => c.difficulty === l).map((c) => <Card key={c.id} href={`/cases/${c.id}/`} title={c.title} meta={<Chip>{c.region}</Chip>}>{c.presentation}</Card>)}
          </div>
        </section>
      ))}
    </>
  );
}
